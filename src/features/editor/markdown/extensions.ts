import type { Extensions } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Placeholder } from '@tiptap/extensions';
import { StarterKit } from '@tiptap/starter-kit';

const PLACEHOLDER_TEXT = 'Write something, or press / for AI commands';

// A paragraph whose text starts with block syntax would parse back as that block. Each rule
// escapes only the marker, so the text is kept literally. `*`, backticks and `>` are already
// handled by the Markdown manager (it escapes `*` and backticks and encodes `>` as `&gt;`), so
// they are not repeated here.
function escapeLeadingBlockMarker(line: string): string {
  return line
    .replace(/^([-+])(?=\s|$)/, '\\$1')
    .replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2')
    .replace(/^(#{1,6})(?=\s|$)/, '\\$1')
    .replace(/^-(?=--)/, '\\-');
}

// T2, D13: the paragraph keeps TipTap's Markdown output and only escapes a leading block marker,
// so plain text such as "- one" stays a paragraph after a reload.
const EscapingParagraph = Paragraph.extend({
  renderMarkdown(node, helpers, ctx) {
    return escapeLeadingBlockMarker(this.parent?.call(this, node, helpers, ctx) ?? '');
  },
});

// D13, D15, T2: the editor reads and writes Markdown. StarterKit has no node or mark that
// renders raw HTML, and the Markdown extension turns HTML in the source into schema nodes
// only (no HTML node exists), so script or img tags in the source never become live DOM (T10).
// Paragraph is taken out of StarterKit and replaced by EscapingParagraph, which has the same name.
export function createEditorExtensions(): Extensions {
  return [
    StarterKit.configure({ paragraph: false }),
    EscapingParagraph,
    Placeholder.configure({ placeholder: PLACEHOLDER_TEXT }),
    Markdown,
  ];
}
