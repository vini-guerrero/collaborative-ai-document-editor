import { getSchema } from '@tiptap/core';
import type { Node, Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import type { RestructureOperation } from '@shared/schemas/restructure';
import { createEditorExtensions } from '../markdown/extensions';
import {
  clearRestructureMeta,
  createRestructurePreviewProseMirrorPlugin,
  getRestructurePreview,
  setRestructureMeta,
} from './restructurePreviewPlugin';

// Pure state, no view (D11). The schema comes from the real editor extensions.
const schema: Schema = getSchema(createEditorExtensions());

function docOf(): Node {
  return schema.node('doc', null, [
    schema.node('heading', { level: 2 }, [schema.text('Intro')]),
    schema.node('paragraph', null, [schema.text('Intro text.')]),
    schema.node('heading', { level: 2 }, [schema.text('Pricing')]),
    schema.node('paragraph', null, [schema.text('Pricing text.')]),
  ]);
}

function stateOf(): EditorState {
  return EditorState.create({
    doc: docOf(),
    schema,
    plugins: [createRestructurePreviewProseMirrorPlugin()],
  });
}

const MOVE: RestructureOperation = { op: 'move', from: 1, to: 0 };

describe('restructure preview state (D11)', () => {
  it('holds no preview until one is set', () => {
    expect(getRestructurePreview(stateOf())).toBeNull();
  });

  it('stores the pending operation without changing the document', () => {
    const state = stateOf();
    const next = state.apply(setRestructureMeta(state.tr, MOVE));
    expect(getRestructurePreview(next)).toEqual(MOVE);
    expect(next.doc.eq(state.doc)).toBe(true);
  });

  it('keeps preview changes out of undo history (D17)', () => {
    const tr = setRestructureMeta(stateOf().tr, MOVE);
    expect(tr.getMeta('addToHistory')).toBe(false);
  });

  it('clears the preview on a clear meta', () => {
    const state = stateOf();
    const previewed = state.apply(setRestructureMeta(state.tr, MOVE));
    const cleared = previewed.apply(clearRestructureMeta(previewed.tr));
    expect(getRestructurePreview(cleared)).toBeNull();
  });

  it('treats any document change as stale and drops the preview', () => {
    const state = stateOf();
    const previewed = state.apply(setRestructureMeta(state.tr, MOVE));
    const edited = previewed.apply(previewed.tr.insertText('x', 2));
    expect(edited.doc.eq(previewed.doc)).toBe(false);
    expect(getRestructurePreview(edited)).toBeNull();
  });

  it('keeps the preview through a transaction that does not change the document', () => {
    const state = stateOf();
    const previewed = state.apply(setRestructureMeta(state.tr, MOVE));
    const selected = previewed.apply(previewed.tr.setSelection(previewed.selection));
    expect(getRestructurePreview(selected)).toEqual(MOVE);
  });
});
