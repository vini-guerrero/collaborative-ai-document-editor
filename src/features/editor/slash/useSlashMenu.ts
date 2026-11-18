import { useEffect, useRef, useState } from 'react';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import type { SlashMenuHandlers, SlashSuggestionProps } from './slashExtension';
import type { SlashItem } from './slashItems';
import { slashKeyOutcome } from './slashKeyboard';
import type { SlashPosition } from './SlashMenu';

// Gap between the caret line and the menu, in px (S5: --ds-space-100).
const SLASH_MENU_GAP_PX = 8;

export interface SlashMenuView {
  readonly items: readonly SlashItem[];
  readonly activeIndex: number;
  readonly position: SlashPosition | null;
}

export interface SlashMenuController {
  // The open menu, or null while no slash menu is shown.
  readonly view: SlashMenuView | null;
  // Stable for the editor's lifetime: the extension is built once with these.
  readonly handlers: SlashMenuHandlers;
  // Runs an item: deletes the typed `/query`, then calls onChoose (D12).
  readonly choose: (item: SlashItem) => void;
}

function positionOf(props: SlashSuggestionProps): SlashPosition | null {
  const rect = props.clientRect?.() ?? null;
  return rect === null ? null : { top: rect.bottom + SLASH_MENU_GAP_PX, left: rect.left };
}

function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0));
}

// D12: keeps the menu's state for the suggestion plugin. The plugin's callbacks run outside React,
// so they write through refs and one setState; the keyboard moves the active index while the
// editor keeps focus. `onChoose` is kept current by an effect.
export function useSlashMenu(onChoose: (item: SlashItem) => void): SlashMenuController {
  const [view, setView] = useState<SlashMenuView | null>(null);
  const viewRef = useRef<SlashMenuView | null>(null);
  const commandRef = useRef<SlashSuggestionProps['command'] | null>(null);
  const chooseRef = useRef(onChoose);

  useEffect(() => {
    chooseRef.current = onChoose;
  });

  const publish = (next: SlashMenuView | null): void => {
    viewRef.current = next;
    setView(next);
  };

  const choose = (item: SlashItem): void => {
    const command = commandRef.current;
    if (command === null || item.soon === true) {
      return;
    }
    command(item);
    publish(null);
    chooseRef.current(item);
  };

  const [handlers] = useState<SlashMenuHandlers>(() => ({
    onStart: (props) => {
      commandRef.current = props.command;
      publish({ items: props.items, activeIndex: 0, position: positionOf(props) });
    },
    onUpdate: (props) => {
      commandRef.current = props.command;
      const activeIndex = clampIndex(viewRef.current?.activeIndex ?? 0, props.items.length);
      publish({ items: props.items, activeIndex, position: positionOf(props) });
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      const current = viewRef.current;
      if (current === null) {
        return false;
      }
      const outcome = slashKeyOutcome(props.event.key, current.activeIndex, current.items.length);
      if (outcome.type === 'move') {
        publish({ ...current, activeIndex: outcome.index });
        return true;
      }
      const item = current.items[current.activeIndex];
      if (outcome.type === 'choose' && item !== undefined) {
        choose(item);
        return true;
      }
      return false;
    },
    onExit: () => {
      commandRef.current = null;
      publish(null);
    },
  }));

  return { view, handlers, choose };
}
