import { useRef, useState, type JSX } from 'react';
import type { Editor } from '@tiptap/react';
import { TextField, VisuallyHidden } from '@/design-system';
import {
  toStoredDocument,
  useDocumentStore,
  type Result,
  type StoreError,
  type StoredDocument,
} from '@/features/documents';
import { EditorSurface } from './EditorSurface';
import { EditorTopBar } from './EditorTopBar';
import type { ViewMode } from './editorModes';
import { MarkdownSource } from './MarkdownSource';
import { serializeMarkdown } from './markdown/markdown';
import { applyMarkdownSource } from './applyMarkdownSource';
import { useAiMode } from './useAiMode';
import { useAutosave, type AutosaveFailure, type AutosaveStatus } from './useAutosave';

const DEFAULT_TITLE = 'Untitled document';

export interface EditorFormProps {
  documentId: string;
  // Null for a new draft that is not in the store yet (H5).
  initial: StoredDocument | null;
  now: () => number;
  onReady?: ((editor: Editor) => void) | undefined;
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
// The body lives in the TipTap editor; this form keeps only the latest Markdown in a ref, so
// no copy of the document is mirrored in React state. The raw Markdown view (D15) keeps the
// editor mounted but hidden, so its undo history survives a switch.
export function EditorForm({ documentId, initial, now, onReady }: EditorFormProps): JSX.Element {
  const store = useDocumentStore();
  const initialTitle = initial?.title ?? '';
  const initialBody = initial?.markdown ?? '';
  const persistedRef = useRef<StoredDocument | null>(initial);
  const latestRef = useRef<EditorDraft>({ title: initialTitle, body: initialBody });
  const editorRef = useRef<Editor | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  // The raw Markdown being edited while the Markdown view is shown (D15).
  const [source, setSource] = useState('');
  const { aiMode, setAiMode } = useAiMode();

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

  const scheduleBody = (body: string): void => {
    latestRef.current = { ...latestRef.current, body };
    schedule(latestRef.current);
  };

  const handleReady = (editor: Editor): void => {
    editorRef.current = editor;
    onReady?.(editor);
  };

  // D15: entering the raw view copies the document's Markdown; leaving it parses the text back.
  const changeViewMode = (next: ViewMode): void => {
    const editor = editorRef.current;
    if (editor === null || next === viewMode) {
      return;
    }
    if (next === 'markdown') {
      setSource(serializeMarkdown(editor));
    } else {
      const body = applyMarkdownSource(editor, source);
      if (body !== latestRef.current.body) {
        scheduleBody(body);
      }
    }
    setViewMode(next);
  };

  const titleField = (
    <TextField
      label="Document title"
      hideLabel
      placeholder={DEFAULT_TITLE}
      value={title}
      onChange={(event) => {
        const nextTitle = event.target.value;
        setTitle(nextTitle);
        latestRef.current = { ...latestRef.current, title: nextTitle };
        schedule(latestRef.current);
      }}
    />
  );

  return (
    <>
      <EditorTopBar
        message={saveMessage(status, failure)}
        title={titleField}
        view={{
          viewMode,
          onViewModeChange: changeViewMode,
          aiMode,
          onAiModeChange: setAiMode,
        }}
      />
      <main className="editor-page-main">
        <h1>
          <VisuallyHidden>Edit document</VisuallyHidden>
        </h1>
        {viewMode === 'markdown' ? (
          <MarkdownSource
            value={source}
            onChange={(text) => {
              setSource(text);
              scheduleBody(text);
            }}
          />
        ) : null}
        <div hidden={viewMode === 'markdown'}>
          <EditorSurface
            initialMarkdown={initialBody}
            onChange={scheduleBody}
            onReady={handleReady}
          />
        </div>
      </main>
    </>
  );
}
