import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import type { RestructureOperation } from '@shared/schemas/restructure';
import { createEditorExtensions } from '../markdown/extensions';
import { parseMarkdown, serializeMarkdown } from '../markdown/markdown';
import { applyRestructure } from './applyRestructure';
import { outline } from './sections';
import {
  createRestructurePreviewExtension,
  getRestructurePreview,
  setRestructureMeta,
} from './restructurePreviewPlugin';

// Runs Accept through a real headless editor (D10, D11, T3). Each editor is destroyed after its test.
const SOURCE = '# Intro\n\nIntro text.\n\n## Pricing\n\nPricing text.\n\n## Team\n\nTeam text.\n';
const SPLIT_SOURCE = '# Intro\n\nA.\n\n## Pricing\n\nFirst.\n\nSecond.\n';
const SCRIPT_HEADING = '## <img src="x" onerror="alert(1)">Title\n\nBody.\n\n# Other\n\nText.\n';

const open: Editor[] = [];

afterEach(() => {
  for (const editor of open.splice(0)) {
    editor.destroy();
  }
});

function createEditor(source: string): Editor {
  const parsed = parseMarkdown(source);
  if (!parsed.ok) {
    throw new Error(`parse failed: ${parsed.error.reason}`);
  }
  const editor = new Editor({
    extensions: [...createEditorExtensions(), createRestructurePreviewExtension()],
    content: parsed.value,
  });
  open.push(editor);
  return editor;
}

function headingsOf(editor: Editor): (string | null)[] {
  return outline(serializeMarkdown(editor)).map((section) => section.heading);
}

describe('applyRestructure', () => {
  it('moves a section to its new place', () => {
    const editor = createEditor(SOURCE);
    const result = applyRestructure(editor, { op: 'move', from: 2, to: 0 });
    expect(result).toEqual({ ok: true });
    expect(headingsOf(editor)).toEqual(['Team', 'Intro', 'Pricing']);
  });

  it('merges a section into the one before it', () => {
    const editor = createEditor(SOURCE);
    const result = applyRestructure(editor, { op: 'merge', first: 1, second: 2 });
    expect(result).toEqual({ ok: true });
    expect(headingsOf(editor)).toEqual(['Intro', 'Pricing']);
    expect(serializeMarkdown(editor)).toContain('Team text.');
  });

  it('splits a section before the chosen paragraph into a new section', () => {
    const editor = createEditor(SPLIT_SOURCE);
    const result = applyRestructure(editor, { op: 'split', section: 1, atParagraph: 1 });
    expect(result).toEqual({ ok: true });
    expect(headingsOf(editor)).toEqual(['Intro', 'Pricing', 'New section']);
    expect(serializeMarkdown(editor)).toContain('Second.');
  });

  it('returns the reason for an invalid index and changes nothing', () => {
    const editor = createEditor(SOURCE);
    const before = serializeMarkdown(editor);
    const operation: RestructureOperation = { op: 'move', from: 9, to: 0 };
    expect(applyRestructure(editor, operation)).toEqual({ ok: false, reason: 'invalid_index' });
    expect(serializeMarkdown(editor)).toBe(before);
    expect(editor.can().undo()).toBe(false);
  });

  it('returns noop when the section stays where it is', () => {
    const editor = createEditor(SOURCE);
    const before = serializeMarkdown(editor);
    expect(applyRestructure(editor, { op: 'move', from: 1, to: 1 })).toEqual({
      ok: false,
      reason: 'noop',
    });
    expect(serializeMarkdown(editor)).toBe(before);
  });

  it('is one undo step: one undo restores the previous document exactly', () => {
    const editor = createEditor(SOURCE);
    const before = serializeMarkdown(editor);
    applyRestructure(editor, { op: 'move', from: 2, to: 0 });
    expect(serializeMarkdown(editor)).not.toBe(before);
    editor.commands.undo();
    expect(serializeMarkdown(editor)).toBe(before);
    expect(editor.can().undo()).toBe(false);
  });

  it('clears the preview once the change is accepted', () => {
    const editor = createEditor(SOURCE);
    editor.view.dispatch(setRestructureMeta(editor.state.tr, { op: 'move', from: 2, to: 0 }));
    expect(getRestructurePreview(editor.state)).not.toBeNull();
    applyRestructure(editor, { op: 'move', from: 2, to: 0 });
    expect(getRestructurePreview(editor.state)).toBeNull();
  });

  it('shows the preview as an accent bar at the new place and a ghost at the old place', () => {
    const editor = createEditor(SOURCE);
    editor.view.dispatch(setRestructureMeta(editor.state.tr, { op: 'move', from: 2, to: 0 }));
    expect(editor.view.dom.querySelectorAll('.restructure-ghost')).toHaveLength(2);
    expect(editor.view.dom.querySelectorAll('.restructure-target')).toHaveLength(1);
    expect(editor.getText()).toContain('Team text.');
  });

  it('renders a heading with markup as text, never as a live element', () => {
    const editor = createEditor(SCRIPT_HEADING);
    expect(applyRestructure(editor, { op: 'move', from: 0, to: 1 })).toEqual({ ok: true });
    expect(editor.view.dom.querySelector('img')).toBeNull();
    expect(editor.view.dom.querySelector('[onerror]')).toBeNull();
  });
});
