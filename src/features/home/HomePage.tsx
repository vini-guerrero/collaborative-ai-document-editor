import type { JSX } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AppShell, Button, EmptyState, Spinner } from '@/design-system';
import { DocumentGrid } from './DocumentGrid';
import { DocumentList } from './DocumentList';
import { EmptyHome } from './EmptyHome';
import { HomeNavbar } from './HomeNavbar';
import { HomeSidebar } from './HomeSidebar';
import type { DocumentListState } from './useDocuments';
import { useDocuments } from './useDocuments';
import { ViewToggle, type DocumentView } from './ViewToggle';
import './home.css';
import './views.css';

export interface HomePageProps {
  // Injected by tests; the default is a random UUID, which the editor route accepts (H5).
  newId?: () => string;
  // Injected by tests; the default is the current time, read once per render (H4 "Edited x ago").
  now?: number;
}

interface DocumentsPanelOptions {
  view: DocumentView;
  now: number;
  onViewChange: (view: DocumentView) => void;
  onRetry: () => void;
  onNewDocument: () => void;
}

function createDocumentId(): string {
  return crypto.randomUUID();
}

function renderDocuments(state: DocumentListState, options: DocumentsPanelOptions): JSX.Element {
  if (state.kind === 'loading') {
    return (
      <div className="home-page__loading">
        <Spinner label="Loading documents" />
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div role="alert">
        <EmptyState
          title="Could not load your documents"
          description="Storage could not be read. Try again."
          action={<Button onClick={options.onRetry}>Retry</Button>}
        />
      </div>
    );
  }
  if (state.documents.length === 0) {
    return <EmptyHome onNewDocument={options.onNewDocument} />;
  }
  return (
    <>
      <ViewToggle value={options.view} onChange={options.onViewChange} />
      {options.view === 'grid' ? (
        <DocumentGrid documents={state.documents} now={options.now} />
      ) : (
        <DocumentList documents={state.documents} now={options.now} />
      )}
    </>
  );
}

// H1-H4, H6: the app's first screen. Every read state is rendered; none blanks the page (D14).
export function HomePage({ newId = createDocumentId, now }: HomePageProps): JSX.Element {
  const navigate = useNavigate();
  const { state, retry } = useDocuments();
  const [view, setView] = useState<DocumentView>('grid');
  // Read once when the page mounts: relative times stay stable across re-renders (purity).
  const [renderedAt] = useState(() => now ?? Date.now());

  function startNewDocument(): void {
    void navigate(`/documents/${newId()}`);
  }

  return (
    <AppShell navbar={<HomeNavbar />} sidebar={<HomeSidebar onNewDocument={startNewDocument} />}>
      <div className="home-page">
        <h1 className="home-page__title">Documents</h1>
        {renderDocuments(state, {
          view,
          now: renderedAt,
          onViewChange: setView,
          onRetry: retry,
          onNewDocument: startNewDocument,
        })}
      </div>
    </AppShell>
  );
}
