import { act, renderHook, waitFor } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import {
  DocumentStoreProvider,
  type DocumentStore,
  type DocumentSummary,
  type Result,
  type StoreError,
} from '@/features/documents';
import { useDocuments } from './useDocuments';

type ListResult = Result<DocumentSummary[], StoreError>;

const SUMMARY: DocumentSummary = { id: 'a', title: 'Plan', preview: 'Goals', updatedAt: 1 };

// Each call to list() takes the next scripted outcome; a rejected outcome rejects the promise.
function scriptedStore(outcomes: (ListResult | Error)[]): DocumentStore {
  let index = 0;
  return {
    list: (): Promise<ListResult> => {
      const outcome = outcomes[index];
      index += 1;
      if (outcome === undefined) {
        return Promise.reject(new Error('no scripted outcome left'));
      }
      return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
    },
    get: () => Promise.resolve({ ok: false, error: { kind: 'not-found' } } as const),
    save: () => Promise.resolve({ ok: true, value: undefined } as const),
    remove: () => Promise.resolve({ ok: true, value: undefined } as const),
  };
}

function wrapperFor(store: DocumentStore): ({ children }: { children: ReactNode }) => JSX.Element {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <DocumentStoreProvider store={store}>{children}</DocumentStoreProvider>;
  };
}

describe('useDocuments', () => {
  // H1: the hook starts in loading and moves to ready with the index summaries.
  it('starts loading and becomes ready with the listed documents (H1)', async () => {
    const store = scriptedStore([{ ok: true, value: [SUMMARY] }]);
    const { result } = renderHook(() => useDocuments(), { wrapper: wrapperFor(store) });

    expect(result.current.state).toEqual({ kind: 'loading' });
    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'ready', documents: [SUMMARY] });
    });
  });

  // D14: a failed result becomes the error state instead of throwing.
  it('becomes error when the store returns a failed result (D14)', async () => {
    const store = scriptedStore([{ ok: false, error: { kind: 'corrupt' } }]);
    const { result } = renderHook(() => useDocuments(), { wrapper: wrapperFor(store) });

    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'error' });
    });
  });

  // D14: a rejected read is handled as the error state, never left unhandled.
  it('becomes error when the store read rejects (D14)', async () => {
    const store = scriptedStore([new Error('storage disabled')]);
    const { result } = renderHook(() => useDocuments(), { wrapper: wrapperFor(store) });

    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'error' });
    });
  });

  // D14: retry moves error back to loading and then to ready when the read succeeds.
  it('retry re-runs the read from error to ready (D14)', async () => {
    const store = scriptedStore([
      { ok: false, error: { kind: 'corrupt' } },
      { ok: true, value: [] },
    ]);
    const { result } = renderHook(() => useDocuments(), { wrapper: wrapperFor(store) });

    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'error' });
    });
    act(() => {
      result.current.retry();
    });
    expect(result.current.state).toEqual({ kind: 'loading' });
    await waitFor(() => {
      expect(result.current.state).toEqual({ kind: 'ready', documents: [] });
    });
  });
});
