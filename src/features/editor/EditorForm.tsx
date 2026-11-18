import { useRef, useState, type JSX } from 'react';
import type { Editor } from '@tiptap/react';
import { TextField, VisuallyHidden } from '@/design-system';
import { StatusIndicator } from '@/features/ai';
import type { HistoryEntry, StoredDocument } from '@/features/documents';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { EditorOverlays } from './EditorOverlays';
import { EditorSurface } from './EditorSurface';
import { EditorTopBar } from './EditorTopBar';
import { NextFlagButton } from './NextFlagButton';
import type { ViewMode } from './editorModes';
import { MarkdownSource } from './MarkdownSource';
import { serializeMarkdown } from './markdown/markdown';
import { applyMarkdownSource } from './applyMarkdownSource';
import { useRestructureFlow } from './restructure/useRestructureFlow';
import { rewriteActionsFor } from './suggestion/rewriteActions';
import { useRewriteSession } from './suggestion/useRewriteSession';
import type { SlashItem } from './slash/slashItems';
import { useAiMode } from './useAiMode';
import { useDocumentPersistence } from './useDocumentPersistence';
import type { AutosaveFailure, AutosaveStatus } from './useAutosave';

const DEFAULT_TITLE = 'Untitled document';
// DEBT: the slash item restructures with "move". The user's choice of move, split or merge (D10)
// needs a sub-choice in the slash menu; revisit with the restructure-choice phase.
const SLASH_RESTRUCTURE_ACTION = 'move';

export interface EditorFormProps {
  documentId: string;
  // Null for a new draft that is not in the store yet (H5).
  initial: StoredDocument | null;
  now: () => number;
  onReady?: ((editor: Editor) => void) | undefined;
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
  const editorRef = useRef<Editor | null>(null);
  const initialBody = initial?.markdown ?? '';
  const persistence = useDocumentPersistence({ documentId, initial, now, editorRef });
  const {
    status,
    failure,
    schedule,
    latestRef,
    scheduleBody,
    recordAiAccept,
    restoreFromHistory,
    historyRef,
  } = persistence;
  const [title, setTitle] = useState(initial?.title ?? '');
  useDocumentTitle(title.trim() === '' ? DEFAULT_TITLE : title);
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  // The raw Markdown being edited while the Markdown view is shown (D15).
  const [source, setSource] = useState('');
  // The editor handle, once mounted, for the controls outside the surface (D17).
  const [mountedEditor, setMountedEditor] = useState<Editor | null>(null);
  // The flag whose popover is open, by id (D17).
  const [openFlagId, setOpenFlagId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Read from the ref when the panel opens (an event), not during render.
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  // The rewrite in progress, from a flag, a selection, a slash command or a section (D5, D9).
  const rewrite = useRewriteSession(mountedEditor);
  const actions = rewriteActionsFor(mountedEditor, rewrite);
  const restructure = useRestructureFlow(mountedEditor, recordAiAccept);
  const { aiMode, setAiMode } = useAiMode();
  // D1, D15: nothing is analyzed in On Demand mode or while the raw Markdown is shown.
  const aiPaused = aiMode === 'on-demand' || viewMode === 'markdown';

  // Opening another flag ends a rewrite that belongs to a different popover (D5).
  const openFlag = (flagId: string | null): void => {
    if (rewrite.target !== null && rewrite.target.flagId !== flagId) {
      rewrite.stop();
    }
    setOpenFlagId(flagId);
  };

  const chooseSlashItem = (item: SlashItem): void => {
    if (item.id === 'restructure-section') {
      restructure.run(SLASH_RESTRUCTURE_ACTION);
      return;
    }
    actions.chooseSlashItem(item);
  };

  const handleReady = (ready: Editor): void => {
    editorRef.current = ready;
    setMountedEditor(ready);
    onReady?.(ready);
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

  // D7: closes the timeline once the entry is restored.
  const restoreVersion = (entryId: string): void => {
    if (restoreFromHistory(entryId)) {
      setHistoryOpen(false);
    }
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
    <div className="editor-page">
      <EditorTopBar
        message={saveMessage(status, failure)}
        title={titleField}
        aiStatus={<StatusIndicator />}
        flagControl={
          mountedEditor === null ? null : (
            <NextFlagButton editor={mountedEditor} onOpenFlag={openFlag} />
          )
        }
        view={{
          viewMode,
          onViewModeChange: changeViewMode,
          aiMode,
          onAiModeChange: setAiMode,
          onHistory: () => {
            setHistoryEntries([...historyRef.current]);
            setHistoryOpen(true);
          },
        }}
      />
      <main
        className={
          viewMode === 'markdown' ? 'editor-page-main editor-page-main--wide' : 'editor-page-main'
        }
      >
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
        <div hidden={viewMode === 'markdown'} className="editor-page-body">
          <EditorSurface
            initialMarkdown={initialBody}
            onChange={scheduleBody}
            onReady={handleReady}
            aiPaused={aiPaused}
            onFlagOpen={openFlag}
            onSlashChoose={chooseSlashItem}
            onImprove={actions.improveSection}
          />
        </div>
        <EditorOverlays
          editor={mountedEditor}
          selectionEnabled={viewMode === 'visual' && rewrite.target === null}
          session={rewrite}
          actions={actions}
          restructure={restructure}
          flagId={openFlagId}
          onFlagClose={() => {
            openFlag(null);
          }}
          onAccepted={recordAiAccept}
          historyOpen={historyOpen}
          historyEntries={historyEntries}
          now={now()}
          onHistoryClose={() => {
            setHistoryOpen(false);
          }}
          onRestoreVersion={restoreVersion}
        />
      </main>
    </div>
  );
}
