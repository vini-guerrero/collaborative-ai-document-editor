import { useRef, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import {
  restoreEntry,
  toStoredDocument,
  useDocumentStore,
  type HistoryEntry,
  type Result,
  type StoreError,
  type StoredDocument,
} from '@/features/documents';
import { serializeMarkdown } from './markdown/markdown';
import { createEntryId, withAiAccept, withCheckpoint, withSnapshot } from './history/historyLog';
import { restoreVersion } from './history/useHistoryRestore';
import { useAutosave, type AutosaveFailure, type AutosaveStatus } from './useAutosave';

const DEFAULT_TITLE = 'Untitled document';

export interface EditorDraft {
  readonly title: string;
  readonly body: string;
}

export interface DocumentPersistenceInput {
  documentId: string;
  initial: StoredDocument | null;
  now: () => number;
  // The live editor, read when history is recorded or restored.
  editorRef: RefObject<Editor | null>;
}

export interface DocumentPersistence {
  readonly status: AutosaveStatus;
  readonly failure: AutosaveFailure | null;
  // Schedules a save of the draft held in latestRef (title and body).
  readonly schedule: (draft: EditorDraft) => void;
  readonly latestRef: RefObject<EditorDraft>;
  readonly scheduleBody: (body: string) => void;
  // D7: records an accepted AI change as an entry, then saves.
  readonly recordAiAccept: (label: string, before: string) => void;
  // D7: restores an entry as one undo step and saves. False when it could not be restored.
  readonly restoreFromHistory: (entryId: string) => boolean;
  // The history the next save writes, read when the timeline opens.
  readonly historyRef: RefObject<HistoryEntry[]>;
}

// Saving, the "You" checkpoints (D7) and the version history for one document. The editor is
// the source of the body; this hook keeps only refs and the autosave queue (no React copy).
export function useDocumentPersistence({
  documentId,
  initial,
  now,
  editorRef,
}: DocumentPersistenceInput): DocumentPersistence {
  const store = useDocumentStore();
  const initialTitle = initial?.title ?? '';
  const initialBody = initial?.markdown ?? '';
  const persistedRef = useRef<StoredDocument | null>(initial);
  const latestRef = useRef<EditorDraft>({ title: initialTitle, body: initialBody });
  const historyRef = useRef<HistoryEntry[]>([...(initial?.history ?? [])]);

  const persist = async (draft: EditorDraft): Promise<Result<void, StoreError>> => {
    const stamp = now();
    // A new document's first save is not a checkpoint: its last save is that save itself.
    const lastSavedAt = persistedRef.current?.updatedAt ?? stamp;
    historyRef.current = withCheckpoint(
      historyRef.current,
      draft.body,
      lastSavedAt,
      stamp,
      createEntryId(),
    );
    const doc: StoredDocument = {
      ...toStoredDocument(
        persistedRef.current,
        {
          id: documentId,
          title: draft.title.trim() === '' ? DEFAULT_TITLE : draft.title,
          markdown: draft.body,
        },
        stamp,
      ),
      history: [...historyRef.current],
    };
    let result = await store.save(doc);
    if (!result.ok && result.error.kind === 'quota') {
      // D7: over the storage quota, the oldest half of the history is dropped and the save retried once.
      const kept = historyRef.current.slice(Math.floor(historyRef.current.length / 2));
      historyRef.current = kept;
      result = await store.save({ ...doc, history: [...kept] });
    }
    if (result.ok) {
      persistedRef.current = { ...doc, history: [...historyRef.current] };
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

  // D7: the author's text before the change is kept first, then the AI entry is recorded.
  const recordAiAccept = (label: string, before: string): void => {
    const editor = editorRef.current;
    if (editor === null) {
      return;
    }
    const stamp = now();
    const withBefore = withSnapshot(historyRef.current, before, stamp, createEntryId());
    historyRef.current = withAiAccept(withBefore, {
      id: createEntryId(),
      markdown: serializeMarkdown(editor),
      label,
      now: stamp,
    });
    schedule(latestRef.current);
  };

  const restoreFromHistory = (entryId: string): boolean => {
    const editor = editorRef.current;
    if (editor === null) {
      return false;
    }
    const result = restoreEntry({ history: historyRef.current }, entryId, now(), createEntryId());
    if (result === null || !restoreVersion(editor, result.markdown).ok) {
      return false;
    }
    historyRef.current = result.history;
    scheduleBody(serializeMarkdown(editor));
    return true;
  };

  return {
    status,
    failure,
    schedule,
    latestRef,
    scheduleBody,
    recordAiAccept,
    restoreFromHistory,
    historyRef,
  };
}
