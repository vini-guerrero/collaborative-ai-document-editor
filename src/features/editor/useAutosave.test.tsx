import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Result, StoreError } from '@/features/documents';
import { AUTOSAVE_DELAY_MS, useAutosave } from './useAutosave';

type SaveResult = Result<void, StoreError>;
interface Draft {
  readonly body: string;
}

const SAVED: SaveResult = { ok: true, value: undefined };

// Fake timers that keep advancing with real time so waitFor works (AGENTS: no fixed sleeps).
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(document, 'visibilityState');
});

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function savingMock() {
  return vi.fn<(draft: Draft) => Promise<SaveResult>>(() => Promise.resolve(SAVED));
}

describe('useAutosave', () => {
  // D17: writes are debounced by 500 ms; a newer change restarts the delay.
  it('writes the latest draft once after the 500 ms debounce (D17)', async () => {
    const save = savingMock();
    const { result } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: 'a' });
    });
    await advance(300);
    act(() => {
      result.current.schedule({ body: 'ab' });
    });
    await advance(AUTOSAVE_DELAY_MS - 1);
    expect(save).not.toHaveBeenCalled();

    await advance(1);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ body: 'ab' });
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
  });

  // D17: unmounting must not lose the last change.
  it('flushes the pending draft on unmount (D17)', () => {
    const save = savingMock();
    const { result, unmount } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: 'unsaved' });
    });
    unmount();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ body: 'unsaved' });
  });

  // D17: leaving the page (pagehide) writes what is pending.
  it('flushes the pending draft on pagehide (D17)', () => {
    const save = savingMock();
    const { result } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: 'leaving' });
    });
    window.dispatchEvent(new Event('pagehide'));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ body: 'leaving' });
  });

  // D17: switching to another tab (visibility hidden) writes what is pending.
  it('flushes the pending draft when the page becomes hidden (D17)', () => {
    const save = savingMock();
    const { result } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: 'hidden soon' });
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ body: 'hidden soon' });
  });

  // H5: a new document that was never written in is not kept.
  it('does not save a blank new draft (H5)', async () => {
    const save = savingMock();
    const { result } = renderHook(() => useAutosave({ save, isNew: true }));

    act(() => {
      result.current.schedule({ body: '   \n ' });
    });
    await advance(AUTOSAVE_DELAY_MS);

    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  // H5: once a document exists, clearing its body is a change worth keeping.
  it('saves an existing document even when its body is cleared (H5)', async () => {
    const save = savingMock();
    const { result } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: '' });
    });
    await advance(AUTOSAVE_DELAY_MS);

    expect(save).toHaveBeenCalledTimes(1);
  });

  // H5: the new-or-existing decision is made when the flush runs. After a first write attempt,
  // clearing the body saves even while that first write is still in flight.
  it('treats a new draft as existing once a write was attempted (H5)', async () => {
    const settlers: (() => void)[] = [];
    const save = vi.fn<(draft: Draft) => Promise<SaveResult>>(
      () =>
        new Promise<SaveResult>((resolve) => {
          settlers.push(() => {
            resolve(SAVED);
          });
        }),
    );
    const { result } = renderHook(() => useAutosave({ save, isNew: true }));

    act(() => {
      result.current.schedule({ body: 'first' });
    });
    await advance(AUTOSAVE_DELAY_MS);
    act(() => {
      result.current.schedule({ body: '' });
    });
    await advance(AUTOSAVE_DELAY_MS);

    expect(save).toHaveBeenCalledTimes(1);

    await act(() => {
      settlers[0]?.();
      return Promise.resolve();
    });
    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(2);
    });
    expect(save).toHaveBeenLastCalledWith({ body: '' });
  });

  // D17: writes run one after another. A newer write never starts before the older one has
  // settled, so the last value stored is always the newest one.
  it('never starts a newer write before the older write settles (D17)', async () => {
    let stored = '';
    const settlers: (() => void)[] = [];
    const save = vi.fn<(draft: Draft) => Promise<SaveResult>>(
      (draft) =>
        new Promise<SaveResult>((resolve) => {
          settlers.push(() => {
            stored = draft.body;
            resolve(SAVED);
          });
        }),
    );
    const { result } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: 'older' });
    });
    await advance(AUTOSAVE_DELAY_MS);
    act(() => {
      result.current.schedule({ body: 'newer' });
    });
    await advance(AUTOSAVE_DELAY_MS);

    expect(save).toHaveBeenCalledTimes(1);

    await act(() => {
      settlers[0]?.();
      return Promise.resolve();
    });
    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(2);
    });
    await act(() => {
      settlers[1]?.();
      return Promise.resolve();
    });

    expect(stored).toBe('newer');
  });

  // D14 and D17: a failed write is reported with its kind, without losing the text.
  it('reports a failed status when the store returns a quota error', async () => {
    const save = vi.fn<(draft: Draft) => Promise<SaveResult>>(() =>
      Promise.resolve({ ok: false, error: { kind: 'quota' } }),
    );
    const { result } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: 'keep me' });
    });
    await advance(AUTOSAVE_DELAY_MS);

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.failure).toBe('failed');
  });

  // The store reports invalid documents as their own kind, shown with its own message.
  it('reports an invalid failure when the store rejects the document', async () => {
    const save = vi.fn<(draft: Draft) => Promise<SaveResult>>(() =>
      Promise.resolve({ ok: false, error: { kind: 'invalid' } }),
    );
    const { result } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: 'x' });
    });
    await advance(AUTOSAVE_DELAY_MS);

    await waitFor(() => {
      expect(result.current.failure).toBe('invalid');
    });
    expect(result.current.status).toBe('error');
  });

  // The store rejects on storage failures that are not quota errors (DocumentStore contract).
  it('reports a failed status when the store rejects', async () => {
    const save = vi.fn<(draft: Draft) => Promise<SaveResult>>(() =>
      Promise.reject(new Error('storage disabled')),
    );
    const { result } = renderHook(() => useAutosave({ save, isNew: false }));

    act(() => {
      result.current.schedule({ body: 'keep me' });
    });
    await advance(AUTOSAVE_DELAY_MS);

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.failure).toBe('failed');
  });

  // Nothing pending means nothing to write, even when unmounting under StrictMode's double
  // effect run.
  it('does not save on unmount when nothing is pending (StrictMode)', () => {
    const save = savingMock();
    const StrictWrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children);
    const { unmount } = renderHook(() => useAutosave({ save, isNew: false }), {
      wrapper: StrictWrapper,
    });

    unmount();

    expect(save).not.toHaveBeenCalled();
  });
});
