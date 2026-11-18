import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { RestructureOperation } from '@shared/schemas/restructure';
import { parseMarkdown, serializeMarkdown } from '../markdown/markdown';
import { applyOperation } from './sections';
import { separateHeadings } from './headingBreaks';

export type ApplyRestructureResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'invalid_index' | 'noop' | 'invalid_markdown' };

// D10, D11, T3: Accept. The operation is applied to the Markdown of the current document, and the
// whole document is replaced in one transaction, so one undo restores the previous document. The
// preview clears because the document changed (its plugin treats a changed document as stale).
// closeHistory before and after keeps the change a single undo step, as in applySuggestion.
export function applyRestructure(
  editor: Editor,
  operation: RestructureOperation,
): ApplyRestructureResult {
  const result = applyOperation(serializeMarkdown(editor), operation);
  if (!result.ok) return { ok: false, reason: result.reason };
  const parsed = parseMarkdown(separateHeadings(result.markdown));
  if (!parsed.ok) return { ok: false, reason: 'invalid_markdown' };
  const next = editor.schema.nodeFromJSON(parsed.value);
  const { state } = editor;
  const tr = closeHistory(state.tr).replaceWith(0, state.doc.content.size, next.content);
  editor.view.dispatch(tr);
  editor.view.dispatch(closeHistory(editor.state.tr));
  return { ok: true };
}
