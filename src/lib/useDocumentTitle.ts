import { useEffect } from 'react';

const PRODUCT_NAME = 'WebApp';

// Keeps the browser tab title in step with the screen: "Page - WebApp", or the product name alone
// for an empty page name. The previous title is restored when the screen goes away.
export function useDocumentTitle(pageName: string): void {
  useEffect(() => {
    const previous = document.title;
    const trimmed = pageName.trim();
    document.title = trimmed === '' ? PRODUCT_NAME : `${trimmed} - ${PRODUCT_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [pageName]);
}
