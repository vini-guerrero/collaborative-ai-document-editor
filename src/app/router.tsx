import { lazy, Suspense, type JSX } from 'react';
import { createBrowserRouter, useParams, type DataRouter, type RouteObject } from 'react-router';
import { Spinner } from '@/design-system';
import { NotFound } from '@/app/NotFound';
import { RouteError } from '@/app/RouteError';

// Lazy so each feature's code loads only when its route is opened (AGENTS: route-level lazy).
const HomePage = lazy(() =>
  import('@/features/home').then((loaded) => ({ default: loaded.HomePage })),
);
const EditorPage = lazy(() =>
  import('@/features/editor').then((loaded) => ({ default: loaded.EditorPlaceholderPage })),
);

function withSuspense(element: JSX.Element): JSX.Element {
  return <Suspense fallback={<Spinner label="Loading page" />}>{element}</Suspense>;
}

// Ids are short and URL-safe; anything else is not a document this app can have (H5).
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Keyed by id at the route so opening another document remounts the editor with fresh state.
function EditorRoute(): JSX.Element {
  const { id } = useParams();
  if (id === undefined || !DOCUMENT_ID_PATTERN.test(id)) {
    return <NotFound />;
  }
  return <EditorPage key={id} documentId={id} />;
}

// Plain data, no router instance: tests build a memory router from the same table.
export function createAppRoutes(): RouteObject[] {
  return [
    { path: '/', element: withSuspense(<HomePage />), errorElement: <RouteError /> },
    {
      path: '/documents/:id',
      element: withSuspense(<EditorRoute />),
      errorElement: <RouteError />,
    },
    { path: '*', element: <NotFound />, errorElement: <RouteError /> },
  ];
}

export function createAppRouter(): DataRouter {
  return createBrowserRouter(createAppRoutes());
}
