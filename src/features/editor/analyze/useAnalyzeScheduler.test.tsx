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

type OnFlags = (hash: string, flags: Flag[]) => void;

interface HarnessProps {
  paused: boolean;
  onFlags: OnFlags;
  onWorking?: (hash: string | null) => void;
  onHandle: (handle: AnalyzeSchedulerHandle) => void;
}

// Buttons stand in for the editor: an edit followed by leaving the paragraph is what analyzes it.
function Harness({ paused, onFlags, onWorking, onHandle }: HarnessProps): JSX.Element {
  const handle = useAnalyzeScheduler({
    paused,
    onFlags,
    isLive: () => true,
    ...(onWorking === undefined ? {} : { onWorking }),
  });
  useEffect(() => {
    onHandle(handle);
  }, [handle, onHandle]);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          handle.paragraphEdited(CONTEXT);
        }}
      >
        Edit paragraph
      </button>
      <button
        type="button"
        onClick={() => {
          handle.paragraphLeft(CONTEXT);
        }}
      >
        Leave paragraph
      </button>
    </>
  );
}

interface RenderOptions {
  paused?: boolean;
  onWorking?: (hash: string | null) => void;
  store?: AiStatusStore;
  fetchImpl: FetchLike;
}

const renderHarness = ({
  paused = false,
  onWorking,
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
        {...(onWorking === undefined ? {} : { onWorking })}
        onHandle={(handle) => {
          handles.push(handle);
        }}
      />
    </AiStatusProvider>,
  );
  return { ...result, onFlags, handles, store };
};

// Edits the paragraph, then leaves it, the way the editor reports it.
const editAndLeave = async (): Promise<void> => {
  await userEvent.click(screen.getByRole('button', { name: 'Edit paragraph' }));
  await userEvent.click(screen.getByRole('button', { name: 'Leave paragraph' }));
};

describe('useAnalyzeScheduler (D4, D1, D14, D15, T10)', () => {
  it('emits the flags for the edited paragraph once it is left', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const { onFlags } = renderHarness({ fetchImpl });
    await editAndLeave();
    await waitFor(() => {
      expect(onFlags).toHaveBeenCalledWith(fnv1a32(PARAGRAPH), [FLAG]);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports the paragraph under analysis, then none, for the AI bubble', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const onWorking = vi.fn<(hash: string | null) => void>();
    renderHarness({ fetchImpl, onWorking });
    await editAndLeave();
    await waitFor(() => {
      expect(onWorking).toHaveBeenLastCalledWith(null);
    });
    expect(onWorking).toHaveBeenNthCalledWith(1, fnv1a32(PARAGRAPH));
  });

  it('makes no call while paused in On Demand mode or the raw view (D1, D15)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const { onFlags } = renderHarness({ paused: true, fetchImpl });
    await editAndLeave();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(onFlags).not.toHaveBeenCalled();
  });

  it('keeps analyzing after an outage, since the next request can recover (D14)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const store = createAiStatusStore();
    store.begin();
    store.end({ ok: false, error: { kind: 'unavailable' } });
    const { onFlags } = renderHarness({ store, fetchImpl });
    await editAndLeave();
    await waitFor(() => {
      expect(onFlags).toHaveBeenCalledTimes(1);
    });
    expect(store.getSnapshot()).toBe('ready');
  });

  it('stops calling and emits nothing once out of credit (D14)', async () => {
    const fetchImpl = vi.fn<FetchLike>(() =>
      Promise.resolve(
        jsonResponse(402, { error: { code: 'out_of_credit', message: 'No credit.' } }),
      ),
    );
    const store = createAiStatusStore();
    const { onFlags } = renderHarness({ store, fetchImpl });
    await editAndLeave();
    await waitFor(() => {
      expect(store.getSnapshot()).toBe('out_of_credit');
    });
    await editAndLeave();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onFlags).not.toHaveBeenCalled();
  });

  it('stops scheduling after unmount (cleanup on unmount)', () => {
    const fetchImpl = vi.fn<FetchLike>(() => Promise.resolve(jsonResponse(200, { flags: [FLAG] })));
    const { handles, unmount } = renderHarness({ fetchImpl });
    const handle = handles[0];
    expect(handle).toBeDefined();
    unmount();
    handle?.paragraphEdited(CONTEXT);
    handle?.paragraphLeft(CONTEXT);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
