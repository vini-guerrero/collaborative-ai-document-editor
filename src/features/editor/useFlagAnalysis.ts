import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';
import type { Flag } from '@shared/schemas';
import { hashOfText } from './analyze/paragraphContext';
import { useAnalyzeScheduler } from './analyze/useAnalyzeScheduler';
import { paragraphContextOf, paragraphIdAt, paragraphsOf } from './paragraphs';
import { setFlagsMeta } from './flags/flagsPlugin';

// Applies one paragraph's flags to the paragraph whose text still has this hash (T10). The text is
// looked up by hash, not by id, because inserting a paragraph above renumbers the ids.
// DEBT: with two identical paragraphs only the first gets flags; applying to both would leave a
// flag that Dismiss does not clear. Revisit with a per-paragraph flag identity.
function showParagraphFlags(editor: Editor, hash: string, flags: readonly Flag[]): void {
  const paragraph = paragraphsOf(editor.state.doc).find((entry) => hashOfText(entry.text) === hash);
  if (paragraph === undefined) {
    return;
  }
  editor.view.dispatch(
    setFlagsMeta(editor.state.tr, { paragraphPos: paragraph.pos, blockHash: hash, flags }),
  );
}

// Where the paragraph holding the caret starts, or undefined when the caret is in a heading.
function caretParagraphPos(editor: Editor): number | undefined {
  const paragraphs = paragraphsOf(editor.state.doc);
  const id = paragraphIdAt(paragraphs, editor.state.selection.$from);
  return paragraphs.find((paragraph) => paragraph.id === id)?.pos;
}

// D4: connects the editor to the analyze scheduler. Edits mark the caret paragraph and start its
// pause; a collapsed caret leaving a focused paragraph analyzes it. Range selections and blur send
// nothing. Nothing is sent while `paused` (D1 On Demand, D15 raw view).
export function useFlagAnalysis(editor: Editor, paused: boolean): string | null {
  // The hash of the paragraph being analyzed right now, for the AI bubble's loading state.
  const [analyzingHash, setAnalyzingHash] = useState<string | null>(null);
  const scheduler = useAnalyzeScheduler({
    paused,
    onWorking: setAnalyzingHash,
    onFlags: (hash, flags) => {
      showParagraphFlags(editor, hash, flags);
    },
    isLive: (hash) =>
      paragraphsOf(editor.state.doc).some((paragraph) => hashOfText(paragraph.text) === hash),
  });

  useEffect(() => {
    if (paused) {
      scheduler.pause();
    }
  }, [paused, scheduler]);

  useEffect(() => {
    // The start position of the paragraph the caret was last in. Every transaction maps it, so a
    // paragraph inserted above (Enter) keeps pointing at the same paragraph.
    let caretPos = caretParagraphPos(editor);
    const handleTransaction = ({ transaction }: { transaction: Transaction }): void => {
      if (!transaction.docChanged && !transaction.selectionSet) {
        return;
      }
      caretPos = caretPos === undefined ? undefined : transaction.mapping.map(caretPos);
      const { selection } = editor.state;
      const paragraphs = paragraphsOf(editor.state.doc);
      const currentId = paragraphIdAt(paragraphs, selection.$from);
      if (selection.empty) {
        const previous = paragraphs.find((paragraph) => paragraph.pos === caretPos);
        // Only a collapsed caret in a focused editor counts as leaving (D4).
        if (editor.isFocused && previous !== undefined && previous.id !== currentId) {
          const left = paragraphContextOf(paragraphs, previous.id);
          if (left !== undefined) {
            scheduler.paragraphLeft(left);
          }
        }
        const current = paragraphs.find((paragraph) => paragraph.id === currentId);
        caretPos = current?.pos;
      }
      if (transaction.docChanged && currentId !== undefined) {
        const edited = paragraphContextOf(paragraphs, currentId);
        if (edited !== undefined) {
          scheduler.paragraphEdited(edited);
        }
      }
    };
    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, scheduler]);

  return analyzingHash;
}
