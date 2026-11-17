import type { Editor } from '@tiptap/react';
import { serializeMarkdown } from './markdown/markdown';

// D15: leaving the raw Markdown view parses its text into the editor as Markdown, never as HTML
// (T10). When the text is unchanged the editor is left alone, so its undo history survives a
// plain round trip. Returns the canonical Markdown the editor holds afterwards.
export function applyMarkdownSource(editor: Editor, source: string): string {
  const current = serializeMarkdown(editor);
  if (current === source) {
    return current;
  }
  editor.commands.setContent(source, { contentType: 'markdown' });
  return serializeMarkdown(editor);
}
