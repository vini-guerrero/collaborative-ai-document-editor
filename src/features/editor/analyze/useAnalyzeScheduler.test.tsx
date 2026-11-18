import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { JSX } from 'react';
import { useEffect } from 'react';
import {
  AiStatusProvider,
  createAiClient,
  createAiStatusStore,
  type AiStatusStore,
  type FetchLike,
} from '@/features/ai';
import { fnv1a32 } from '@/lib/hash';
import type { Flag } from '@shared/schemas';
import { useAnalyzeScheduler, type AnalyzeSchedulerHandle } from './useAnalyzeScheduler';
import type { ParagraphContext } from './paragraphContext';

// T9: the AI is faked at the fetch boundary; the real client and status store run on top of it.
const PARAGRAPH = 'The launch moved to the second week of March.';
const FLAG: Flag = { kind: 'clarity', quote: 'moved', reason: 'Say why the date changed.' };
const CONTEXT: ParagraphContext = { id: 'p1', text: PARAGRAPH };

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type OnFlags = (paragraphId: string, hash: string, flags: Flag[]) => void;

interface HarnessProps {
  paused: boolean;
  onFlags: OnFlags;
  onHandle: (handle: AnalyzeSchedulerHandle) => void;
}

// A button stands in for the editor: leaving the paragraph is what triggers the analysis.
function Harness({ paused, onFlags, onHandle }: HarnessProps): JSX.Element {
  const handle = useAnalyzeScheduler({ paused, onFlags });
  useEffect(() => {
    onHandle(handle);
  }, [handle, onHandle]);
  return (
    <button
      type="button"
      onClick={() => {
        handle.paragraphLeft(CONTEXT);
      }}
    >
      Leave paragraph
    </button>
  );
}

interface RenderOptions {
  paused?: boolean;
  store?: AiStatusStore;
  fetchImpl: FetchLike;
}

const renderHarness = ({
  paused = false,
  store = createAiStatusStore(),
  fetchImpl,
}: RenderOptions) => {
  const onFlags = vi.fn<OnFlags>();
  const handles: AnalyzeSchedulerHandle[] = [];
  const client = createAiClient({ fetchImpl });
  const result = render(
    <AiStatusProvider client={client} store={store}>
      <Harness
        paused={paused}
        onFlags={onFlags}
        onHandle={(handle) => {
          handles.push(handle);
        }}
      />
    </AiStatusProvider>,
  );
  return { ...result, onFlags, handles, store };
};

describe('useAnalyzeScheduler (D4, D1, D14, D15, T10)', () => {
  it('emits the flags for the paragraph after it is left', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const { onFlags } = renderHarness({ fetchImpl });
    await userEvent.click(screen.getByRole('button', { name: 'Leave paragraph' }));
    await waitFor(() => {
      expect(onFlags).toHaveBeenCalledWith('p1', fnv1a32(PARAGRAPH), [FLAG]);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('makes no call while paused in On demand mode or the raw view (D1, D15)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const { onFlags } = renderHarness({ paused: true, fetchImpl });
    await userEvent.click(screen.getByRole('button', { name: 'Leave paragraph' }));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(onFlags).not.toHaveBeenCalled();
  });

  it('makes no call while the AI status is not ready (D14)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const store = createAiStatusStore();
    store.begin();
    store.end({ ok: false, error: { kind: 'unavailable' } });
    renderHarness({ store, fetchImpl });
    await userEvent.click(screen.getByRole('button', { name: 'Leave paragraph' }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stops calling and emits nothing once out of credit (D14)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() =>
      Promise.resolve(
        jsonResponse(402, { error: { code: 'out_of_credit', message: 'No credit.' } }),
      ),
    );
    const store = createAiStatusStore();
    const { onFlags } = renderHarness({ store, fetchImpl });
    await userEvent.click(screen.getByRole('button', { name: 'Leave paragraph' }));
    await waitFor(() => {
      expect(store.getSnapshot()).toBe('out_of_credit');
    });
    await userEvent.click(screen.getByRole('button', { name: 'Leave paragraph' }));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onFlags).not.toHaveBeenCalled();
  });

  it('stops scheduling after unmount (cleanup on unmount)', () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const { handles, unmount } = renderHarness({ fetchImpl });
    const handle = handles[0];
    expect(handle).toBeDefined();
    unmount();
    handle?.paragraphLeft(CONTEXT);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
