import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { DecorationSet } from '@tiptap/pm/view';
import { z } from 'zod';
import {
  SuggestionSchema,
  isSuggestionValid,
  mapSuggestion,
  suggestionDecorations,
  type Suggestion,
} from './suggestionState';

export const suggestionKey = new PluginKey<SuggestionState>('aiSuggestion');

// At most one suggestion is previewed at a time (D5).
export interface SuggestionState {
  readonly active: Suggestion | null;
}

const EMPTY_SUGGESTION: SuggestionState = { active: null };

// Plugin meta arrives as unknown; only the shapes written below are accepted.
const SuggestionMetaSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('set'), suggestion: SuggestionSchema }).strict(),
  z.object({ type: z.literal('clear') }).strict(),
]);

// Preview changes are not undo steps (D17): only Accept is.
export function setSuggestionMeta(tr: Transaction, suggestion: Suggestion): Transaction {
  return tr.setMeta(suggestionKey, { type: 'set', suggestion }).setMeta('addToHistory', false);
}

export function clearSuggestionMeta(tr: Transaction): Transaction {
  return tr.setMeta(suggestionKey, { type: 'clear' }).setMeta('addToHistory', false);
}

export function getSuggestion(state: EditorState): Suggestion | null {
  return suggestionKey.getState(state)?.active ?? null;
}

// A suggestion whose text changed is dropped, and so is its flag (the flags plugin drops flags
// whose block hash changed, and this plugin uses the same block-hash rule).
export function createSuggestionProseMirrorPlugin(): Plugin<SuggestionState> {
  return new Plugin<SuggestionState>({
    key: suggestionKey,
    state: {
      init: () => EMPTY_SUGGESTION,
      apply: (tr: Transaction, value: SuggestionState): SuggestionState => {
        const meta = SuggestionMetaSchema.safeParse(tr.getMeta(suggestionKey));
        if (meta.success && meta.data.type === 'clear') {
          return EMPTY_SUGGESTION;
        }
        if (meta.success && meta.data.type === 'set') {
          const { suggestion } = meta.data;
          return { active: isSuggestionValid(tr.doc, suggestion) ? suggestion : null };
        }
        if (value.active === null || !tr.docChanged) {
          return value;
        }
        return { active: mapSuggestion(value.active, tr) };
      },
    },
    props: {
      decorations: (state: EditorState): DecorationSet | null => {
        const active = getSuggestion(state);
        return active === null ? null : suggestionDecorations(state.doc, active);
      },
    },
  });
}

// TipTap wrapper, registered next to the flags plugin in the editor surface.
export function createSuggestionPlugin(): Extension {
  return Extension.create({
    name: 'aiSuggestion',
    addProseMirrorPlugins() {
      return [createSuggestionProseMirrorPlugin()];
    },
  });
}
