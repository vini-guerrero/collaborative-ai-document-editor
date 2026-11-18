import type { Editor } from '@tiptap/react';
import type { SlashItem } from '../slash/slashItems';
import {
  paragraphRangeAt,
  sectionParagraphRange,
  selectionRangeOf,
  type TextRange,
} from './rewriteRanges';
import { rewriteTargetOf } from './rewriteTarget';
import type { RewriteSession, RoundPick } from './useRewriteSession';

export interface RewriteActions {
  readonly rewriteSelection: (first: RoundPick) => void;
  readonly rewriteParagraph: (first: RoundPick) => void;
  readonly improveSection: (headingPos: number) => void;
  readonly chooseSlashItem: (item: SlashItem) => void;
  readonly collapseSelection: () => void;
}

const SELECTION_TITLE = 'Selected Text';
const PARAGRAPH_TITLE = 'Paragraph';
const SECTION_TITLE = 'Section';
// D6 default: the AI picks the tone and keeps the length.
const AUTO_TONE: RoundPick = { type: 'setTone', tone: 'auto' };
const IMPROVE_INSTRUCTION = 'Improve clarity';

function startAt(
  editor: Editor,
  session: RewriteSession,
  range: TextRange | null,
  title: string,
  first: RoundPick,
): void {
  if (range === null) {
    return;
  }
  const target = rewriteTargetOf(editor.state.doc, range, {
    title,
    detail: undefined,
    flagId: undefined,
  });
  if (target !== null) {
    session.start(target, first);
  }
}

// D6, D9, D12: each entry point turns its text range into a target and starts a rewrite. A plain
// factory (not a hook): the caller passes the current editor and session on each render.
export function rewriteActionsFor(editor: Editor | null, session: RewriteSession): RewriteActions {
  const withEditor = (action: (current: Editor) => void): void => {
    if (editor !== null) {
      action(editor);
    }
  };
  const rewriteParagraph = (first: RoundPick): void => {
    withEditor((current) => {
      startAt(current, session, paragraphRangeAt(current), PARAGRAPH_TITLE, first);
    });
  };
  return {
    rewriteSelection: (first) => {
      withEditor((current) => {
        startAt(current, session, selectionRangeOf(current), SELECTION_TITLE, first);
      });
    },
    rewriteParagraph,
    improveSection: (headingPos) => {
      withEditor((current) => {
        startAt(
          current,
          session,
          sectionParagraphRange(current.state.doc, headingPos),
          SECTION_TITLE,
          { type: 'addInstruction', text: IMPROVE_INSTRUCTION },
        );
      });
    },
    chooseSlashItem: (item) => {
      if (item.id === 'rewrite-paragraph' || item.id === 'change-tone') {
        rewriteParagraph(AUTO_TONE);
      }
    },
    collapseSelection: () => {
      withEditor((current) => {
        current.chain().setTextSelection(current.state.selection.to).focus().run();
      });
    },
  };
}
