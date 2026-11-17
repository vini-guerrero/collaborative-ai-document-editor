import { createContext, useContext } from 'react';
import type { JSX, ReactNode } from 'react';
import type { DocumentStore } from './DocumentStore';

// No default store: a component outside the provider fails loudly instead of silently
// writing to a store nobody configured (T6, store injected at the edge).
const DocumentStoreContext = createContext<DocumentStore | null>(null);

export interface DocumentStoreProviderProps {
  store: DocumentStore;
  children: ReactNode;
}

export function DocumentStoreProvider({
  store,
  children,
}: DocumentStoreProviderProps): JSX.Element {
  return <DocumentStoreContext.Provider value={store}>{children}</DocumentStoreContext.Provider>;
}

export function useDocumentStore(): DocumentStore {
  const store = useContext(DocumentStoreContext);
  if (store === null) {
    throw new Error('useDocumentStore must be used inside a DocumentStoreProvider');
  }
  return store;
}
