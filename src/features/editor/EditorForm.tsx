import { useId, useRef, useState, type JSX } from 'react';
import { TextField, VisuallyHidden } from '@/design-system';
import {
  toStoredDocument,
  useDocumentStore,
  type Result,
  type StoreError,
  type StoredDocument,
} from '@/features/documents';
import { EditorTopBar } from './EditorTopBar';
import { useAutosave, type AutosaveFailure, type AutosaveStatus } from './useAutosave';

// DEBT: a plain textarea stands in until the TipTap editor lands (editor phase, T3).
// The autosave contract (D17, H5) is final; only the body control changes.

const DEFAULT_TITLE = 'Untitled document';

export interface EditorFormProps {
  documentId: string;
  // Null for a new draft that is not in the store yet (H5).
  initial: StoredDocument | null;
  now: () => number;
}

interface EditorDraft {
  readonly title: string;
  readonly body: string;
}

// Only "Saved" and failures are announced; "Saving" on every keystroke would be noise.
function saveMessage(status: AutosaveStatus, failure: AutosaveFailure | null): string {
  if (status === 'saved') {
    return 'Saved';
  }
  if (status === 'error' && failure === 'invalid') {
    return 'This document id is not valid.';
  }
  if (status === 'error') {
    return 'Could not save. Your text is kept here; the next change tries again.';
  }
  return '';
}

// Mounted once per document: the route keys the page by id, so initial values are never stale.
export function EditorForm({ documentId, initial, now }: EditorFormProps): JSX.Element {
  const store = useDocumentStore();
  const bodyId = useId();
  const persistedRef = useRef<StoredDocument | null>(initial);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.markdown ?? '');

  const persist = async (draft: EditorDraft): Promise<Result<void, StoreError>> => {
    const doc = toStoredDocument(
      persistedRef.current,
      {
        id: documentId,
        title: draft.title.trim() === '' ? DEFAULT_TITLE : draft.title,
        markdown: draft.body,
      },
      now(),
    );
    const result = await store.save(doc);
    if (result.ok) {
      persistedRef.current = doc;
    }
    return result;
  };

  const { status, failure, schedule } = useAutosave<EditorDraft>({
    save: persist,
    isNew: initial === null,
  });

  return (
    <>
      <EditorTopBar message={saveMessage(status, failure)} />
      <main className="editor-page-main">
        <h1>
          <VisuallyHidden>Edit document</VisuallyHidden>
        </h1>
        <TextField
          label="Document title"
          hideLabel
          placeholder={DEFAULT_TITLE}
          value={title}
          onChange={(event) => {
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            schedule({ title: nextTitle, body });
          }}
        />
        <label htmlFor={bodyId}>
          <VisuallyHidden>Document body</VisuallyHidden>
        </label>
        <textarea
          id={bodyId}
          value={body}
          onChange={(event) => {
            const nextBody = event.target.value;
            setBody(nextBody);
            schedule({ title, body: nextBody });
          }}
        />
      </main>
    </>
  );
}
