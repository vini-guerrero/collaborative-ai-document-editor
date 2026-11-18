import type { JSX } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { AppShell, Button, EmptyState, Spinner } from '@/design-system';
import type { DocumentSummary } from '@/features/documents';
import { DeleteDocumentDialog } from './DeleteDocumentDialog';
import { DocumentGrid } from './DocumentGrid';
import { DocumentList } from './DocumentList';
import { EmptyHome } from './EmptyHome';
import { HomeNavbar } from './HomeNavbar';
import { HomeSidebar } from './HomeSidebar';
import type { DocumentListState } from './useDocuments';
import { useDocuments } from './useDocuments';
import { useDeleteDocument } from './useDeleteDocument';
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
  onRetry: () => void;
  onNewDocument: () => void;
  onDelete: (doc: DocumentSummary) => void;
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
    // The alert wraps only the sentence; the heading and Retry stay outside it (D14).
    return (
      <EmptyState
        title="Could Not Load Your Documents"
        action={
          <div className="home-page__error">
            <p role="alert" className="home-page__error-text">
              Storage could not be read. Try again.
            </p>
            <Button onClick={options.onRetry}>Retry</Button>
          </div>
        }
      />
    );
  }
  if (state.documents.length === 0) {
    return <EmptyHome onNewDocument={options.onNewDocument} />;
  }
  return options.view === 'grid' ? (
    <DocumentGrid documents={state.documents} now={options.now} onDelete={options.onDelete} />
  ) : (
    <DocumentList documents={state.documents} now={options.now} onDelete={options.onDelete} />
  );
}

// H1-H4, H6: the app's first screen. Every read state is rendered; none blanks the page (D14).
export function HomePage({ newId = createDocumentId, now }: HomePageProps): JSX.Element {
  const navigate = useNavigate();
  useDocumentTitle('Documents');
  const { state, retry, reload } = useDocuments();
  const [view, setView] = useState<DocumentView>('grid');
  // Read once when the page mounts: relative times stay stable across re-renders (purity). They do
  // not refresh while the page stays open; this is accepted for now (H4).
  const [renderedAt] = useState(() => now ?? Date.now());
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set when a delete succeeds, so the dialog's close moves focus to the heading (the removed
  // card's button can no longer take it).
  const deletedRef = useRef(false);
  const deletion = useDeleteDocument({
    onDeleted: () => {
      deletedRef.current = true;
      reload();
    },
  });

  const returnFocusOnClose = useCallback((): HTMLElement | null => {
    const deleted = deletedRef.current;
    deletedRef.current = false;
    return deleted ? headingRef.current : null;
  }, []);

  function startNewDocument(): void {
    void navigate(`/documents/${newId()}`);
  }

  return (
    <AppShell navbar={<HomeNavbar />} sidebar={<HomeSidebar onNewDocument={startNewDocument} />}>
      <div className="home-page">
        <div className="home-page__head">
          <h1 ref={headingRef} tabIndex={-1} className="home-page__title">
            Documents
          </h1>
          {state.kind === 'ready' && state.documents.length > 0 ? (
            <ViewToggle value={view} onChange={setView} />
          ) : null}
        </div>
        {renderDocuments(state, {
          view,
          now: renderedAt,
          onRetry: retry,
          onNewDocument: startNewDocument,
          onDelete: deletion.request,
        })}
        <DeleteDocumentDialog
          state={deletion.state}
          onConfirm={deletion.confirm}
          onCancel={deletion.cancel}
          onCloseFocus={returnFocusOnClose}
        />
      </div>
    </AppShell>
  );
}
