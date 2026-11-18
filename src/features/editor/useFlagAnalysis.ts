import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import type { Flag } from '@shared/schemas';
import { useAnalyzeScheduler } from './analyze/useAnalyzeScheduler';
import { paragraphContextOf, paragraphIdAt, paragraphsOf } from './paragraphs';
import { setFlagsMeta } from './flags/flagsPlugin';

// Applies one paragraph's flags. The paragraph is found again by id, because the document may
// have changed since the request; the plugin drops the flags if the text no longer matches.
function showParagraphFlags(
  editor: Editor,
  paragraphId: string,
  blockHash: string,
  flags: readonly Flag[],
): void {
  const paragraph = paragraphsOf(editor.state.doc).find((entry) => entry.id === paragraphId);
  if (paragraph === undefined) {
    return;
  }
  editor.view.dispatch(
    setFlagsMeta(editor.state.tr, { paragraphPos: paragraph.pos, blockHash, flags }),
  );
}

// D4: connects the editor to the analyze scheduler. Edits restart the paragraph's pause; leaving
// a paragraph analyzes it at once. Nothing is sent while `paused` (D1 On Demand, D15 raw view).
export function useFlagAnalysis(editor: Editor, paused: boolean): void {
  const scheduler = useAnalyzeScheduler({
    paused,
    onFlags: (paragraphId, hash, flags) => {
      showParagraphFlags(editor, paragraphId, hash, flags);
    },
  });

  useEffect(() => {
    if (paused) {
      scheduler.cancelAll();
    }
  }, [paused, scheduler]);

  useEffect(() => {
    let caretParagraphId: string | undefined;
    const handleTransaction = ({ transaction }: { transaction: Transaction }): void => {
      if (!transaction.docChanged && !transaction.selectionSet) {
        return;
      }
      const { doc, selection } = editor.state;
      const paragraphs = paragraphsOf(doc);
      const currentId = paragraphIdAt(paragraphs, selection.$from);
      if (caretParagraphId !== undefined && caretParagraphId !== currentId) {
        const left = paragraphContextOf(paragraphs, caretParagraphId);
        if (left !== undefined) {
          scheduler.paragraphLeft(left);
        }
      }
      if (currentId !== undefined && transaction.docChanged) {
        const edited = paragraphContextOf(paragraphs, currentId);
        if (edited !== undefined) {
          scheduler.paragraphEdited(edited);
        }
      }
      caretParagraphId = currentId;
    };
    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, scheduler]);
}
