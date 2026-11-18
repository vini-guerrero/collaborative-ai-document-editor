import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { AiServicesProvider } from '@/app/AiServicesProvider';
import { ThemeProvider, createThemeController } from '@/design-system';
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

const theme = createThemeController(
  document.documentElement,
  window.matchMedia(DARK_SCHEME_QUERY),
  window.localStorage,
);

const store = createLocalStorageStore({ storage: window.localStorage });

createRoot(getRootElement()).render(
  <StrictMode>
    <ThemeProvider controller={theme}>
      <DocumentStoreProvider store={store}>
        <AiServicesProvider>
          <App />
        </AiServicesProvider>
      </DocumentStoreProvider>
    </ThemeProvider>
  </StrictMode>,
);
