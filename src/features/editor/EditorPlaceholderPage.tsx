import type { JSX } from 'react';
import { Link } from 'react-router';
import { EmptyState, Spinner } from '@/design-system';
import { EditorForm } from './EditorForm';
import { EditorTopBar } from './EditorTopBar';
import './EditorPlaceholderPage.css';
import { useStoredDocument } from './useStoredDocument';

export interface EditorPlaceholderPageProps {
  documentId: string;
  // Injected clock; defaults to Date.now at the page edge (no hidden global in the hook).
  now?: () => number;
}

// Picks the state to show. The form is mounted only once the document is known, so its
// initial values come straight from the loaded document.
export function EditorPlaceholderPage({
  documentId,
  now = Date.now,
}: EditorPlaceholderPageProps): JSX.Element {
  const loaded = useStoredDocument(documentId);

  if (loaded.kind === 'loading') {
    return (
      <>
        <EditorTopBar message="" />
        <main className="editor-page-main">
          <Spinner label="Loading document" />
        </main>
      </>
    );
  }

  if (loaded.kind === 'error') {
    return (
      <>
        <EditorTopBar message="" />
        <main className="editor-page-main">
          <EmptyState
            title="This document could not be opened"
            description="It may be damaged or storage may be unavailable."
            action={<Link to="/">Go to home</Link>}
          />
        </main>
      </>
    );
  }

  return <EditorForm documentId={documentId} initial={loaded.document} now={now} />;
}
