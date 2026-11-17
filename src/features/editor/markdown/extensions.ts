import type { Extensions } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import { Placeholder } from '@tiptap/extensions';
import { StarterKit } from '@tiptap/starter-kit';

const PLACEHOLDER_TEXT = 'Write something, or press / for AI commands';

// D13, D15, T2: the editor reads and writes Markdown. StarterKit has no node or mark that
// renders raw HTML, and the Markdown extension turns HTML in the source into schema nodes
// only (no HTML node exists), so script or img tags in the source never become live DOM (T10).
export function createEditorExtensions(): Extensions {
  return [StarterKit, Placeholder.configure({ placeholder: PLACEHOLDER_TEXT }), Markdown];
}
