import type { JSX } from 'react';
import type { Editor } from '@tiptap/react';
import { Link } from 'react-router';
import { EmptyState, Spinner } from '@/design-system';
import { EditorForm } from './EditorForm';
import { EditorTopBar } from './EditorTopBar';
import './EditorPage.css';
import { useStoredDocument } from './useStoredDocument';

export interface EditorPageProps {
  documentId: string;
  // Injected clock; defaults to Date.now at the page edge (no hidden global in the hook).
  now?: (() => number) | undefined;
}

// Test seam: the same page, plus the live TipTap editor handed out once it exists. Kept out of
// EditorPageProps so the feature's public API never exposes the TipTap type.
export interface EditorPageViewProps extends EditorPageProps {
  onReady?: ((editor: Editor) => void) | undefined;
}

// The public page: no editor handle leaves the feature.
export function EditorPage({ documentId, now }: EditorPageProps): JSX.Element {
  return <EditorPageView documentId={documentId} now={now} />;
}

// Picks the state to show. The form is mounted only once the document is known, so its
// initial values come straight from the loaded document.
export function EditorPageView({
  documentId,
  now = Date.now,
  onReady,
}: EditorPageViewProps): JSX.Element {
  const loaded = useStoredDocument(documentId);

  if (loaded.kind === 'loading') {
    return (
      <>
        <EditorTopBar />
        <main className="editor-page-main">
          <Spinner label="Loading document" />
        </main>
      </>
    );
  }

  if (loaded.kind === 'error') {
    return (
      <>
        <EditorTopBar />
        <main className="editor-page-main">
          <EmptyState
            title="This Document Could Not Be Opened"
            description="It may be damaged or storage may be unavailable."
            action={<Link to="/">Go to Home</Link>}
          />
        </main>
      </>
    );
  }

  return (
    <EditorForm documentId={documentId} initial={loaded.document} now={now} onReady={onReady} />
  );
}
