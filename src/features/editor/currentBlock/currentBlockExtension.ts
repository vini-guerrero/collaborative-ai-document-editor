import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const CURRENT_BLOCK_CLASS = 'current-block';
const currentBlockKey = new PluginKey<DecorationSet>('currentBlock');

// The first level of the document holds the blocks; the caret's block is the one at depth 1.
const TOP_LEVEL_DEPTH = 1;

// D17: the block that holds the caret gets a class, so the page can mark the current line in the
// margin as Notion does. It is a decoration only, so the document is never touched (T3).
export function createCurrentBlockExtension(): Extension {
  return Extension.create({
    name: 'currentBlock',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: currentBlockKey,
          props: {
            decorations(state) {
              const { $head } = state.selection;
              if ($head.depth < TOP_LEVEL_DEPTH) {
                return null;
              }
              const from = $head.before(TOP_LEVEL_DEPTH);
              const to = $head.after(TOP_LEVEL_DEPTH);
              return DecorationSet.create(state.doc, [
                Decoration.node(from, to, { class: CURRENT_BLOCK_CLASS }),
              ]);
            },
          },
        }),
      ];
    },
  });
}
