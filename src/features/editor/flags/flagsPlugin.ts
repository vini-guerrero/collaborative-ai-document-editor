import { Extension } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  EMPTY_FLAGS,
  applyClearFlags,
  applySetFlags,
  mapFlags,
  readFlagsMeta,
  type FlagEntry,
  type FlagsMeta,
  type FlagsState,
  type SetFlagsInput,
} from './flagsState';

export const flagsKey = new PluginKey<FlagsState>('aiFlags');

// T3, D2: flags are decorations. They never alter text; reasons are never rendered here (T10).
export function createFlagDecorations(doc: Node, entries: readonly FlagEntry[]): DecorationSet {
  return DecorationSet.create(
    doc,
    entries.map((entry) =>
      Decoration.inline(entry.from, entry.to, {
        class: `flag flag--${entry.kind}`,
        'data-flag-id': entry.id,
        'data-flag-kind': entry.kind,
      }),
    ),
  );
}

// The ProseMirror plugin on its own, so it can be added to any state (tests included).
// `paragraphPos` in a set meta is a position in the document after the transaction's steps.
export function createFlagsProseMirrorPlugin(): Plugin<FlagsState> {
  return new Plugin<FlagsState>({
    key: flagsKey,
    state: {
      init: () => EMPTY_FLAGS,
      apply: (tr: Transaction, value: FlagsState): FlagsState => {
        const mapped = tr.docChanged ? mapFlags(value, tr) : value;
        const meta: FlagsMeta | undefined = readFlagsMeta(tr.getMeta(flagsKey));
        if (meta?.type === 'set') {
          return applySetFlags(mapped, tr.doc, meta);
        }
        if (meta?.type === 'clear') {
          return applyClearFlags(mapped, meta.id);
        }
        return mapped;
      },
    },
    props: {
      decorations: (state: EditorState): DecorationSet | null => {
        const { entries } = flagsKey.getState(state) ?? EMPTY_FLAGS;
        return entries.length === 0 ? null : createFlagDecorations(state.doc, entries);
      },
    },
  });
}

// TipTap wrapper. Not registered in markdown/extensions.ts yet; a later phase wires it.
export function createFlagsPlugin(): Extension {
  return Extension.create({
    name: 'aiFlags',
    addProseMirrorPlugins() {
      return [createFlagsProseMirrorPlugin()];
    },
  });
}

// D17: flag transactions are not undo steps.
export function setFlagsMeta(tr: Transaction, input: SetFlagsInput): Transaction {
  const meta: FlagsMeta = { type: 'set', ...input };
  return tr.setMeta(flagsKey, meta).setMeta('addToHistory', false);
}

// Clears one flag by id, or every flag when `id` is undefined. Not an undo step (D17).
export function clearFlagsMeta(tr: Transaction, id?: string): Transaction {
  const meta: FlagsMeta = { type: 'clear', id };
  return tr.setMeta(flagsKey, meta).setMeta('addToHistory', false);
}

export function getFlags(state: EditorState): readonly FlagEntry[] {
  return flagsKey.getState(state)?.entries ?? [];
}
