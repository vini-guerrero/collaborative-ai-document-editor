import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { clearFlagsMeta } from '../flags/flagsPlugin';
import { isSuggestionValid, type Suggestion } from './suggestionState';
import { clearSuggestionMeta } from './suggestionPlugin';

export type ApplyResult = { readonly ok: true } | { readonly ok: false; readonly reason: 'stale' };

// D17, T3: Accept is one transaction that replaces the range with the replacement as plain text,
// clears the preview and drops the flag. closeHistory before and after keeps it a single undo
// step: one Cmd+Z restores the original text, and typing before or after is not merged into it.
// A suggestion whose quote or block no longer matches changes nothing and is reported as stale.
export function applySuggestion(editor: Editor, suggestion: Suggestion): ApplyResult {
  if (!isSuggestionValid(editor.state.doc, suggestion)) {
    return { ok: false, reason: 'stale' };
  }
  editor.view.dispatch(closeHistory(editor.state.tr));
  const { state } = editor;
  const tr = state.tr.replaceWith(
    suggestion.from,
    suggestion.to,
    state.schema.text(suggestion.replacement),
  );
  clearSuggestionMeta(tr);
  if (suggestion.flagId !== undefined) {
    clearFlagsMeta(tr, suggestion.flagId);
  }
  // The clear helpers mark the transaction as not undoable. This one is the accept itself, so it
  // is recorded again; the last setMeta wins.
  tr.setMeta('addToHistory', true);
  editor.view.dispatch(tr);
  editor.view.dispatch(closeHistory(editor.state.tr));
  return { ok: true };
}
