import type { JSX } from 'react';
import type { Editor } from '@tiptap/react';
import type { HistoryEntry } from '@/features/documents';
import { FlagPopover } from './FlagPopover';
import { HistoryPanel } from './history/HistoryPanel';
import { RestructurePanel } from './restructure/RestructurePanel';
import type { RestructureFlow } from './restructure/useRestructureFlow';
import type { RewriteActions } from './suggestion/rewriteActions';
import type { RewriteSession } from './suggestion/useRewriteSession';
import { SelectionActions } from './toolbar/SelectionActions';

export interface EditorOverlaysProps {
  editor: Editor | null;
  // False while a rewrite card is open or the raw Markdown view is shown (D9, D15).
  selectionEnabled: boolean;
  session: RewriteSession;
  actions: RewriteActions;
  restructure: RestructureFlow;
  // The flag whose popover is open, by id; null while none is.
  flagId: string | null;
  onFlagClose: () => void;
  onAccepted: (label: string, before: string) => void;
  historyOpen: boolean;
  historyEntries: readonly HistoryEntry[];
  now: number;
  onHistoryClose: () => void;
  onRestoreVersion: (entryId: string) => void;
}

// The floating and panel layers of the editor page: selection actions, the restructure panel,
// the flag and rewrite popover, and the version history. Each one reads the shared handles.
export function EditorOverlays({
  editor,
  selectionEnabled,
  session,
  actions,
  restructure,
  flagId,
  onFlagClose,
  onAccepted,
  historyOpen,
  historyEntries,
  now,
  onHistoryClose,
  onRestoreVersion,
}: EditorOverlaysProps): JSX.Element {
  return (
    <>
      <SelectionActions editor={editor} enabled={selectionEnabled} actions={actions} />
      <RestructurePanel flow={restructure} />
      {editor === null ? null : (
        <FlagPopover
          editor={editor}
          flagId={flagId}
          session={session}
          onClose={onFlagClose}
          onAccepted={onAccepted}
        />
      )}
      <HistoryPanel
        open={historyOpen}
        onClose={onHistoryClose}
        entries={historyEntries}
        now={now}
        onRestore={onRestoreVersion}
      />
    </>
  );
}
