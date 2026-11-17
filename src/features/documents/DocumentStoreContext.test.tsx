import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { DocumentStoreProvider, useDocumentStore } from './DocumentStoreContext';
import type { DocumentStore } from './DocumentStore';

const createFakeStore = (): { store: DocumentStore; removed: string[] } => {
  const removed: string[] = [];
  const store: DocumentStore = {
    list: () => Promise.resolve({ ok: true, value: [] }),
    get: () => Promise.resolve({ ok: false, error: { kind: 'not-found' } }),
    save: () => Promise.resolve({ ok: true, value: undefined }),
    remove: (id: string) => {
      removed.push(id);
      return Promise.resolve({ ok: true, value: undefined });
    },
  };
  return { store, removed };
};

function RemoveButton(): JSX.Element {
  const store = useDocumentStore();
  return <button onClick={() => void store.remove('doc-1')}>Remove</button>;
}

function BareProbe(): JSX.Element {
  useDocumentStore();
  return <p>unreachable</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// T6: the store is injected through context, never imported as a global.
describe('DocumentStoreProvider (T6)', () => {
  it('gives descendants the injected store through useDocumentStore', async () => {
    const user = userEvent.setup();
    const { store, removed } = createFakeStore();
    render(
      <DocumentStoreProvider store={store}>
        <RemoveButton />
      </DocumentStoreProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(removed).toEqual(['doc-1']);
  });
});

describe('useDocumentStore outside a provider (T6)', () => {
  it('throws a clear error instead of falling back to a default store', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<BareProbe />)).toThrow('inside a DocumentStoreProvider');
  });
});
