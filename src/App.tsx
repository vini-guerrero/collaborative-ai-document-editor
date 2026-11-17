import { useState, type JSX } from 'react';
import { RouterProvider, type DataRouter } from 'react-router';
import { createAppRouter } from '@/app/router';

export interface AppProps {
  // Injected by tests (a memory router). Read once at mount; defaults to the browser router.
  router?: DataRouter;
}

export function App({ router }: AppProps): JSX.Element {
  const [activeRouter] = useState<DataRouter>(() => router ?? createAppRouter());
  return <RouterProvider router={activeRouter} />;
}
