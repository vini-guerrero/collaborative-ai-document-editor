import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';

const ROOT_ELEMENT_ID = 'root';

function getRootElement(): HTMLElement {
  const element = document.getElementById(ROOT_ELEMENT_ID);
  if (element === null) {
    throw new Error(`Root element #${ROOT_ELEMENT_ID} was not found in index.html`);
  }
  return element;
}

createRoot(getRootElement()).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
