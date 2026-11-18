import { Extension, type Editor } from '@tiptap/core';
import { Plugin, TextSelection } from '@tiptap/pm/state';
import { getFlags } from './flags/flagsPlugin';
import type { FlagEntry } from './flags/flagsState';

// The editor's storage for this extension. The owner sets `onOpenFlag` from an effect (it is the
// latest callback for the editor's lifetime); the extension reads it when a flag is requested.
export interface FlagNavigationStorage {
  onOpenFlag: ((flagId: string) => void) | undefined;
}

declare module '@tiptap/core' {
  interface Storage {
    flagNavigation: FlagNavigationStorage;
  }
}

// D17: the keyboard path to flags, without hover. Alt+F moves to the next flag and opens it.
// Enter opens the flag the caret is in. A click or tap on a flag opens it. On macOS Option+F
// types a symbol, but ProseMirror's keymap falls back to the key code when Alt is held, so the
// same binding matches. The Next flag button in the top bar stays the touch and pointer path.
export const NEXT_FLAG_SHORTCUT = 'Alt-f';
// Above StarterKit's Enter handling, so the flag gets the key first when the caret is inside it.
const FLAG_NAVIGATION_PRIORITY = 1000;

// The flag after the caret, wrapping to the first. Selects its range and scrolls it into view.
export function goToNextFlag(editor: Editor): FlagEntry | undefined {
  const { state } = editor;
  const flags = [...getFlags(state)].sort((a, b) => a.from - b.from);
  const next = flags.find((flag) => flag.from > state.selection.from) ?? flags[0];
  if (next === undefined) {
    return undefined;
  }
  const selection = TextSelection.create(state.doc, next.from, next.to);
  editor.view.dispatch(state.tr.setSelection(selection).scrollIntoView());
  return next;
}

// The flag whose range holds a collapsed caret. Undefined when text is selected.
function flagAtCaret(editor: Editor): FlagEntry | undefined {
  const { selection } = editor.state;
  if (!selection.empty) {
    return undefined;
  }
  return getFlags(editor.state).find(
    (flag) => flag.from <= selection.from && selection.from < flag.to,
  );
}

// The flag id of the element under a click, if the click landed on a flagged range.
function flagIdOfTarget(target: EventTarget | null): string | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }
  return target.closest<HTMLElement>('[data-flag-id]')?.dataset.flagId;
}

// Points the extension at the latest open-flag callback. Kept as a function so the owning
// component syncs an external system (the editor) without mutating values during render.
export function bindFlagOpener(
  editor: Editor,
  onOpenFlag: ((flagId: string) => void) | undefined,
): void {
  editor.storage.flagNavigation.onOpenFlag = onOpenFlag;
}

// D17: keyboard and pointer routes to a flag's popover. The popover itself lives in React; this
// extension only reports which flag was asked for (`onOpenFlag`).
export function createFlagNavigation(): Extension {
  return Extension.create<unknown, FlagNavigationStorage>({
    name: 'flagNavigation',
    priority: FLAG_NAVIGATION_PRIORITY,
    addStorage() {
      return { onOpenFlag: undefined };
    },
    addKeyboardShortcuts() {
      return {
        [NEXT_FLAG_SHORTCUT]: () => {
          const flag = goToNextFlag(this.editor);
          if (flag === undefined) {
            return false;
          }
          this.storage.onOpenFlag?.(flag.id);
          return true;
        },
        Enter: () => {
          const flag = flagAtCaret(this.editor);
          if (flag === undefined) {
            return false;
          }
          this.storage.onOpenFlag?.(flag.id);
          return true;
        },
      };
    },
    addProseMirrorPlugins() {
      return [
        // Event delegation on the editor DOM: the click's target is the flagged range, if any.
        // Returns false so the click still places the caret as usual.
        new Plugin({
          props: {
            handleDOMEvents: {
              click: (_view, event) => {
                const flagId = flagIdOfTarget(event.target);
                if (flagId !== undefined) {
                  this.storage.onOpenFlag?.(flagId);
                }
                return false;
              },
            },
          },
        }),
      ];
    },
  });
}
