import { Editor, type JSONContent } from '@tiptap/core';
import { createEditorExtensions } from './extensions';

export interface MarkdownError {
  reason: 'invalid-markdown';
  message: string;
}

export type MarkdownResult<T> = { ok: true; value: T } | { ok: false; error: MarkdownError };

// T2: Markdown is the canonical format. Parsing needs no mounted UI, so it runs on a headless
// Editor that is created for one call and destroyed before returning.
// Input: any Markdown string, including raw HTML (which is dropped or kept as text, never live DOM).
// Output: ProseMirror JSON for the document. Errors: `invalid-markdown` when the parser throws.
// The error message never includes the document text (no secrets or content in logs).
export function parseMarkdown(source: string): MarkdownResult<JSONContent> {
  const editor = new Editor({ extensions: createEditorExtensions() });
  try {
    return { ok: true, value: editor.storage.markdown.manager.parse(source) };
  } catch {
    return {
      ok: false,
      error: { reason: 'invalid-markdown', message: 'The Markdown could not be parsed.' },
    };
  } finally {
    editor.destroy();
  }
}

// Input: an editor created with createEditorExtensions(). Output: its document as canonical
// Markdown. The caller owns the editor's lifecycle and destroys it.
export function serializeMarkdown(editor: Editor): string {
  return editor.getMarkdown();
}
