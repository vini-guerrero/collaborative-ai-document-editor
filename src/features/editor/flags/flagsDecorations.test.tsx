import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { fnv1a32 } from '@/lib/hash';
import type { Flag, FlagKind } from '@shared/schemas/flag';
import { createEditorExtensions } from '../markdown/extensions';
import { parseMarkdown } from '../markdown/markdown';
import { createFlagsPlugin, setFlagsMeta } from './flagsPlugin';

// Renders flags through a real view and checks the classes each kind gets (S5, T3). Reasons are
// never rendered; the decoration only adds classes and data attributes.
const SOURCE = [
  'Alpha wording here.',
  'Beta wording here.',
  'Gamma wording here.',
  'Delta wording here.',
].join('\n\n');
const KINDS: readonly FlagKind[] = ['clarity', 'tone', 'grammar', 'question'];

function createEditor(source: string): Editor {
  const parsed = parseMarkdown(source);
  if (!parsed.ok) {
    throw new Error(`parse failed: ${parsed.error.reason}`);
  }
  return new Editor({
    extensions: [...createEditorExtensions(), createFlagsPlugin()],
    content: parsed.value,
  });
}

// Flags one paragraph per kind, using the paragraph text as the quote.
function flagEachParagraph(editor: Editor): void {
  const { doc } = editor.state;
  doc.forEach((node, offset, index) => {
    const kind = KINDS[index];
    if (kind === undefined) {
      return;
    }
    const flag: Flag = { kind, quote: node.textContent, reason: 'Reads better shorter.' };
    // One transaction per paragraph: a transaction carries a single flags meta entry.
    const tr = setFlagsMeta(editor.state.tr, {
      paragraphPos: offset,
      blockHash: fnv1a32(node.textContent),
      flags: [flag],
    });
    editor.view.dispatch(tr);
  });
}

describe('flag decorations (S5, T3)', () => {
  it('renders one inline decoration per flag, with a class per kind', () => {
    const editor = createEditor(SOURCE);
    try {
      flagEachParagraph(editor);

      for (const kind of KINDS) {
        const element = editor.view.dom.querySelector(`.flag--${kind}`);
        expect(element?.classList.contains('flag')).toBe(true);
        expect(element?.getAttribute('data-flag-kind')).toBe(kind);
        expect(element?.getAttribute('data-flag-id')).toBeTruthy();
      }
      expect(editor.view.dom.querySelectorAll('.flag')).toHaveLength(KINDS.length);
    } finally {
      editor.destroy();
    }
  });

  it('does not change the document text when flags are shown', () => {
    const editor = createEditor(SOURCE);
    try {
      const before = editor.state.doc.textContent;

      flagEachParagraph(editor);

      expect(editor.state.doc.textContent).toBe(before);
    } finally {
      editor.destroy();
    }
  });
});
