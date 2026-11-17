import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Menu, type MenuItem } from './Menu';
import { TYPEAHEAD_RESET_MS } from '../list/listKeyboard';

const TRIGGER_NAME = 'Actions';
const MENU_NAME = 'Text actions';
const NEXT_CONTROL = 'Next control';

const ITEMS: readonly MenuItem[] = [
  { id: 'bold', label: 'Bold' },
  { id: 'copy', label: 'Copy' },
  { id: 'cut', label: 'Cut' },
  { id: 'delete', label: 'Delete' },
];

// The next control gives Tab somewhere to go, so the Tab behaviour can be observed.
function renderMenu(
  items: readonly MenuItem[] = ITEMS,
  onSelect = vi.fn(),
): {
  onSelect: (id: string) => void;
  trigger: HTMLElement;
} {
  render(
    <>
      <Menu
        label={MENU_NAME}
        trigger={{ kind: 'text', text: TRIGGER_NAME }}
        items={items}
        onSelect={onSelect}
      />
      <button type="button">{NEXT_CONTROL}</button>
    </>,
  );
  return { onSelect, trigger: screen.getByRole('button', { name: TRIGGER_NAME }) };
}

function item(name: string): HTMLElement {
  return screen.getByRole('menuitem', { name });
}

afterEach(() => {
  vi.useRealTimers();
});

// S5, S9, D17: an action list from a trigger, operated by pointer, touch and keyboard.
describe('Menu (S5, S9, D17)', () => {
  it('exposes the trigger as a menu button with aria-expanded (S7)', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    await user.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu', { name: MENU_NAME })).not.toBeNull();
    expect(screen.getAllByRole('menuitem')).toHaveLength(ITEMS.length);
  });

  it('names an icon-only trigger with the menu label', () => {
    render(
      <Menu
        label="Document actions"
        trigger={{ kind: 'icon', icon: 'menu' }}
        items={ITEMS}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Document actions' })).not.toBeNull();
  });

  it('opens on click and moves focus to the first item', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    await user.click(trigger);

    expect(document.activeElement).toBe(item('Bold'));
  });

  it('opens with ArrowDown on the first item and ArrowUp on the last', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Bold'));

    await user.keyboard('{Escape}');
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('moves with ArrowDown and ArrowUp and wraps at both ends', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();
    await user.click(trigger);

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Copy'));

    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(document.activeElement).toBe(item('Delete'));

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Bold'));
  });

  it('moves to the first and last items with Home and End', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();
    await user.click(trigger);

    await user.keyboard('{End}');
    expect(document.activeElement).toBe(item('Delete'));

    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(item('Bold'));
  });

  it('selects the focused item with Enter, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const { onSelect, trigger } = renderMenu();
    await user.click(trigger);
    await user.keyboard('{ArrowDown}');

    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith('copy');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('selects the focused item with Space', async () => {
    const user = userEvent.setup();
    const { onSelect, trigger } = renderMenu();
    await user.click(trigger);

    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledWith('bold');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { trigger } = renderMenu(ITEMS, onSelect);
    await user.click(trigger);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes on Tab and moves focus to the next control', async () => {
    const user = userEvent.setup();
    const { trigger } = renderMenu();
    await user.click(trigger);

    await user.keyboard('{Tab}');

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: NEXT_CONTROL }));
  });

  it('selects on click or tap', async () => {
    const user = userEvent.setup();
    const { onSelect, trigger } = renderMenu();
    await user.click(trigger);

    await user.click(item('Cut'));

    expect(onSelect).toHaveBeenCalledWith('cut');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('skips disabled items and never selects them', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const items: readonly MenuItem[] = [
      { id: 'bold', label: 'Bold' },
      { id: 'copy', label: 'Copy', disabled: true },
      { id: 'delete', label: 'Delete' },
    ];
    const { trigger } = renderMenu(items, onSelect);
    await user.click(trigger);

    expect(item('Copy').getAttribute('aria-disabled')).toBe('true');

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Delete'));

    await user.click(item('Copy'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(item('Delete'));
    expect(screen.getByRole('menu', { name: MENU_NAME })).not.toBeNull();
  });

  // S9: typing a letter jumps to the next matching label; a pause restarts the search.
  describe('type-ahead', () => {
    it('jumps to a matching label, and repeating a letter moves to the next match', async () => {
      const user = userEvent.setup();
      const { trigger } = renderMenu();
      await user.click(trigger);

      await user.keyboard('c');
      expect(document.activeElement).toBe(item('Copy'));

      await user.keyboard('c');
      expect(document.activeElement).toBe(item('Cut'));
    });

    it('restarts the search after the reset delay', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { trigger } = renderMenu();
      await user.click(trigger);

      await user.keyboard('c');
      expect(document.activeElement).toBe(item('Copy'));

      act(() => {
        vi.advanceTimersByTime(TYPEAHEAD_RESET_MS + 1);
      });
      await user.keyboard('d');

      expect(document.activeElement).toBe(item('Delete'));
    });
  });
});
