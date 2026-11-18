import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { Suggestion, type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion';
import { SLASH_ITEMS, filterSlashItems, type SlashItem } from './slashItems';

export const SLASH_TRIGGER_CHAR = '/';
export const slashMenuKey = new PluginKey('slashMenu');

export type SlashSuggestionProps = SuggestionProps<SlashItem, SlashItem>;

// Supplied by the caller. The extension only reports the suggestion's lifecycle; the caller
// keeps the active index and runs the action. `props.command(item)` deletes the typed `/query`.
export interface SlashMenuHandlers {
  onStart: (props: SlashSuggestionProps) => void;
  onUpdate: (props: SlashSuggestionProps) => void;
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  onExit: () => void;
}

// D12: `/` opens the menu. Space and Esc close it and leave the typed `/` in the text, because the
// plugin only removes its own decoration, never the document text. The suggestion plugin already
// ignores a non-empty selection, so the menu never opens over one. An empty result closes it.
export function createSlashExtension(handlers: SlashMenuHandlers): Extension {
  return Extension.create({
    name: 'slashMenu',
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashItem, SlashItem>({
          pluginKey: slashMenuKey,
          editor: this.editor,
          char: SLASH_TRIGGER_CHAR,
          allowSpaces: false,
          startOfLine: false,
          items: ({ query }) => [...filterSlashItems(SLASH_ITEMS, query)],
          shouldShow: ({ transaction, query }) =>
            transaction.selection.empty && filterSlashItems(SLASH_ITEMS, query).length > 0,
          command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).run();
          },
          render: () => ({
            onStart: (props) => {
              handlers.onStart(props);
            },
            onUpdate: (props) => {
              handlers.onUpdate(props);
            },
            onKeyDown: (props) => handlers.onKeyDown(props),
            onExit: () => {
              handlers.onExit();
            },
          }),
        }),
      ];
    },
  });
}
