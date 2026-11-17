import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { watchColorScheme } from '@/design-system';
import { createLocalStorageStore, DocumentStoreProvider } from '@/features/documents';
import './design-system/tokens.css';

const ROOT_ELEMENT_ID = 'root';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

function getRootElement(): HTMLElement {
  const element = document.getElementById(ROOT_ELEMENT_ID);
  if (element === null) {
    throw new Error(`Root element #${ROOT_ELEMENT_ID} was not found in index.html`);
  }
  return element;
}

watchColorScheme(document.documentElement, window.matchMedia(DARK_SCHEME_QUERY));

const store = createLocalStorageStore({ storage: window.localStorage });

createRoot(getRootElement()).render(
  <StrictMode>
    <DocumentStoreProvider store={store}>
      <App />
    </DocumentStoreProvider>
  </StrictMode>,
);
