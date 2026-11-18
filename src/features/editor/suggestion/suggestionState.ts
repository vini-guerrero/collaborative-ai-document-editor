import { z } from 'zod';
import type { Node } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { diffWords } from '@/lib/diff';
import { fnv1a32 } from '@/lib/hash';
import { MAX_PARAGRAPH_CHARS } from '@shared/schemas';

// A proposed rewrite of one flagged range. It is a preview only until accepted (T3, D5).
export const SuggestionSchema = z
  .object({
    from: z.number().int().nonnegative(),
    to: z.number().int().nonnegative(),
    quote: z.string().min(1).max(MAX_PARAGRAPH_CHARS),
    replacement: z.string().min(1).max(MAX_PARAGRAPH_CHARS),
    blockHash: z.string(),
    flagId: z.string().optional(),
  })
  .strict();

export type Suggestion = z.infer<typeof SuggestionSchema>;

// The suggestion is valid only while its range still reads as its quote, inside one textblock
// whose text is unchanged since the suggestion was written (T10). The range must be text only, so
// one document position is one character and the diff offsets line up with the document.
export function isSuggestionValid(doc: Node, suggestion: Suggestion): boolean {
  const { from, to, quote, blockHash } = suggestion;
  if (from >= to || to > doc.content.size || to - from !== quote.length) {
    return false;
  }
  const $from = doc.resolve(from);
  const $to = doc.resolve(to);
  if (!$from.parent.isTextblock || !$from.sameParent($to)) {
    return false;
  }
  if (fnv1a32($from.parent.textContent) !== blockHash) {
    return false;
  }
  return doc.textBetween(from, to) === quote;
}

// Maps the range through a transaction and keeps it only while it is still valid.
export function mapSuggestion(suggestion: Suggestion, tr: Transaction): Suggestion | null {
  const mapped: Suggestion = {
    ...suggestion,
    from: tr.mapping.map(suggestion.from, 1),
    to: tr.mapping.map(suggestion.to, -1),
  };
  return isSuggestionValid(tr.doc, mapped) ? mapped : null;
}

// Removed words are struck through in place. Added words are widgets, so no document text
// changes before Accept (T3). Widgets take their text with textContent, never as markup (T10).
function insertWidget(pos: number, text: string, key: string): Decoration {
  return Decoration.widget(
    pos,
    () => {
      const span = document.createElement('span');
      span.className = 'suggestion-insert';
      span.textContent = text;
      return span;
    },
    { key },
  );
}

export function suggestionDecorations(doc: Node, suggestion: Suggestion): DecorationSet {
  const decorations: Decoration[] = [];
  let pos = suggestion.from;
  diffWords(suggestion.quote, suggestion.replacement).forEach((op, index) => {
    if (op.kind === 'equal') {
      pos += op.text.length;
    } else if (op.kind === 'delete') {
      decorations.push(
        Decoration.inline(pos, pos + op.text.length, { class: 'suggestion-delete' }),
      );
      pos += op.text.length;
    } else {
      // The key includes the text: ProseMirror reuses a widget with an equal key, so a new round's
      // words would otherwise keep showing the previous round's text.
      decorations.push(insertWidget(pos, op.text, `suggestion-insert-${String(index)}-${op.text}`));
    }
  });
  return DecorationSet.create(doc, decorations);
}
