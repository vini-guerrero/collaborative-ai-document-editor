import { act, renderHook, waitFor } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  DocumentStoreProvider,
  type DocumentStore,
  type DocumentSummary,
  type Result,
  type StoreError,
} from '@/features/documents';
import { DELETE_FAILED_MESSAGE, useDeleteDocument } from './useDeleteDocument';

type RemoveResult = Result<void, StoreError>;

const PLAN: DocumentSummary = { id: 'doc-plan', title: 'Plan', preview: 'Goals', updatedAt: 1 };

// Fake store: each remove() takes the next scripted outcome and records the id it was called with.
function scriptedStore(outcomes: (RemoveResult | Error | Promise<RemoveResult>)[]): {
  store: DocumentStore;
  removed: string[];
} {
  const removed: string[] = [];
  let index = 0;
  const store: DocumentStore = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    get: () => Promise.resolve({ ok: false, error: { kind: 'not-found' } } as const),
    save: () => Promise.resolve({ ok: true, value: undefined } as const),
    remove: (id: string): Promise<RemoveResult> => {
      removed.push(id);
      const outcome = outcomes[index];
      index += 1;
      if (outcome === undefined) {
        return Promise.reject(new Error('no scripted outcome left'));
      }
      if (outcome instanceof Error) {
        return Promise.reject(outcome);
      }
      return outcome instanceof Promise ? outcome : Promise.resolve(outcome);
    },
  };
  return { store, removed };
}

function wrapperFor(store: DocumentStore): ({ children }: { children: ReactNode }) => JSX.Element {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <DocumentStoreProvider store={store}>{children}</DocumentStoreProvider>;
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useDeleteDocument', () => {
  // H5: starts idle; a request opens the confirmation for that document.
  it('starts idle and moves to confirming when a delete is requested (H5)', () => {
    const { store } = scriptedStore([]);
    const { result } = renderHook(() => useDeleteDocument({ onDeleted: vi.fn<() => void>() }), {
      wrapper: wrapperFor(store),
    });

    expect(result.current.state).toEqual({ kind: 'idle' });
    act(() => {
      result.current.request(PLAN);
    });
    expect(result.current.state).toEqual({ kind: 'confirming', document: PLAN });
  });

  // H5: cancelling the confirmation returns to idle without touching the store.
  it('cancel from confirming returns to idle without removing (H5)', () => {
    const { store, removed } = scriptedStore([]);
    const { result } = renderHook(() => useDeleteDocument({ onDeleted: vi.fn<() => void>() }), {
      wrapper: wrapperFor(store),
    });

    act(() => {
      result.current.request(PLAN);
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.state).toEqual({ kind: 'idle' });
    expect(removed).toEqual([]);
  });

  // H5: a successful remove returns to idle and tells the caller to refresh the list.
  it('confirm removes by id, returns to idle and calls onDeleted (H5)', async () => {
    const onDeleted = vi.fn<() => void>();
    const { store, removed } = scriptedStore([{ ok: true, value: undefined }]);
    const { result } = renderHook(() => useDeleteDocument({ onDeleted }), {
      wrapper: wrapperFor(store),
    });

    act(() => {
      result.current.request(PLAN);
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'idle' });
    });
    expect(removed).toEqual(['doc-plan']);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  // D14: not-found means the document is already gone, so it counts as deleted.
  it('treats not-found as a successful delete (D14)', async () => {
    const onDeleted = vi.fn<() => void>();
    const { store } = scriptedStore([{ ok: false, error: { kind: 'not-found' } }]);
    const { result } = renderHook(() => useDeleteDocument({ onDeleted }), {
      wrapper: wrapperFor(store),
    });

    act(() => {
      result.current.request(PLAN);
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'idle' });
    });
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  // D14: a failed remove keeps the document and shows the message; confirm again retries.
  it('keeps the document in error with a message on a failed result, and retries (D14)', async () => {
    const onDeleted = vi.fn<() => void>();
    const { store, removed } = scriptedStore([
      { ok: false, error: { kind: 'quota' } },
      { ok: true, value: undefined },
    ]);
    const { result } = renderHook(() => useDeleteDocument({ onDeleted }), {
      wrapper: wrapperFor(store),
    });

    act(() => {
      result.current.request(PLAN);
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        kind: 'error',
        document: PLAN,
        message: DELETE_FAILED_MESSAGE,
      });
    });
    expect(onDeleted).not.toHaveBeenCalled();

    act(() => {
      result.current.confirm();
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'idle' });
    });
    expect(removed).toEqual(['doc-plan', 'doc-plan']);
  });

  // D14: a rejected remove (storage disabled) is an error state, not an unhandled rejection.
  it('moves to error when the store rejects, keeping the document (D14)', async () => {
    const onDeleted = vi.fn<() => void>();
    const { store } = scriptedStore([new Error('storage disabled')]);
    const { result } = renderHook(() => useDeleteDocument({ onDeleted }), {
      wrapper: wrapperFor(store),
    });

    act(() => {
      result.current.request(PLAN);
    });
    act(() => {
      result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        kind: 'error',
        document: PLAN,
        message: DELETE_FAILED_MESSAGE,
      });
    });
    expect(onDeleted).not.toHaveBeenCalled();
  });

  // H5: while the store call runs, cancel is ignored and a second confirm does nothing.
  it('ignores cancel and repeat confirm while the delete is running (H5)', async () => {
    const onDeleted = vi.fn<() => void>();
    const pending = deferred<RemoveResult>();
    const { store, removed } = scriptedStore([pending.promise]);
    const { result } = renderHook(() => useDeleteDocument({ onDeleted }), {
      wrapper: wrapperFor(store),
    });

    act(() => {
      result.current.request(PLAN);
    });
    act(() => {
      result.current.confirm();
    });
    act(() => {
      result.current.confirm();
    });
    act(() => {
      result.current.cancel();
    });

    expect(result.current.state).toEqual({ kind: 'deleting', document: PLAN });
    expect(removed).toEqual(['doc-plan']);

    await act(async () => {
      pending.resolve({ ok: true, value: undefined });
      await pending.promise;
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'idle' });
    });
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
