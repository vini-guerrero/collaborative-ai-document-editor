import type { JSX } from 'react';
import { Link, useNavigate } from 'react-router';
import { AppShell, Button, EmptyState, Spinner } from '@/design-system';
import { formatRelativeTime } from '@/lib/relativeTime';
import { EmptyHome } from './EmptyHome';
import { HomeNavbar } from './HomeNavbar';
import { HomeSidebar } from './HomeSidebar';
import type { DocumentListState } from './useDocuments';
import { useDocuments } from './useDocuments';
import './home.css';

const UNTITLED_TITLE = 'Untitled document';

export interface HomePageProps {
  // Injected by tests; the default is a random UUID, which the editor route accepts (H5).
  newId?: () => string;
}

function createDocumentId(): string {
  return crypto.randomUUID();
}

function renderDocuments(
  state: DocumentListState,
  onRetry: () => void,
  onNewDocument: () => void,
): JSX.Element {
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
          action={<Button onClick={onRetry}>Retry</Button>}
        />
      </div>
    );
  }
  if (state.documents.length === 0) {
    return <EmptyHome onNewDocument={onNewDocument} />;
  }
  const now = Date.now();
  return (
    <ul className="home-list">
      {state.documents.map((doc) => (
        <li key={doc.id} className="home-list__item">
          <Link to={`/documents/${doc.id}`} className="home-list__link">
            {doc.title.trim() === '' ? UNTITLED_TITLE : doc.title}
          </Link>
          {doc.preview.length > 0 ? <p className="home-list__preview">{doc.preview}</p> : null}
          <p className="home-list__meta">Edited {formatRelativeTime(doc.updatedAt, now)}</p>
        </li>
      ))}
    </ul>
  );
}

// H1, H2, H3, H6: the app's first screen. Every read state is rendered; none blanks the page (D14).
export function HomePage({ newId = createDocumentId }: HomePageProps): JSX.Element {
  const navigate = useNavigate();
  const { state, retry } = useDocuments();

  function startNewDocument(): void {
    void navigate(`/documents/${newId()}`);
  }

  return (
    <AppShell navbar={<HomeNavbar />} sidebar={<HomeSidebar onNewDocument={startNewDocument} />}>
      <div className="home-page">
        <h1 className="home-page__title">Documents</h1>
        {renderDocuments(state, retry, startNewDocument)}
      </div>
    </AppShell>
  );
}
