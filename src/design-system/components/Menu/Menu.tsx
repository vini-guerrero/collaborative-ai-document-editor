import {
  useCallback,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Icon, type IconName } from '../../icons';
import '../Button/Button.css';
import '../IconButton/IconButton.css';
import { Popover } from '../Popover/Popover';
import {
  LIST_KEY,
  findTabStop,
  firstEnabledIndex,
  isTypeaheadKey,
  lastEnabledIndex,
  navigationTarget,
  typeaheadTarget,
} from '../list/listKeyboard';
import './Menu.css';
import { useTypeaheadQuery } from '../list/useTypeaheadQuery';

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  // Shown and announced, but never selected or reached by the arrow keys (H2, H3).
  readonly disabled?: boolean;
}

// The trigger is either an icon-only button (named by the menu label) or a text button.
export type MenuTrigger =
  | { readonly kind: 'icon'; readonly icon: IconName }
  | { readonly kind: 'text'; readonly text: string };

export interface MenuProps {
  // Accessible name of the menu, for example "Document actions".
  label: string;
  trigger: MenuTrigger;
  items: readonly MenuItem[];
  onSelect: (id: string) => void;
}

// S5, S9, D17: an action list opened from a trigger. Focus moves into the list on open and back
// to the trigger on close. Every action has a pointer, touch and keyboard path.
export function Menu({ label, trigger, items, onSelect }: MenuProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useTypeaheadQuery();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Set when Tab closes the menu, so focus lands on the next control rather than the trigger.
  const tabStopRef = useRef<HTMLElement | null>(null);

  function open(index: number): void {
    setActiveIndex(index);
    setIsOpen(true);
  }

  // Popover re-subscribes its document listeners whenever onClose changes, so close is kept
  // stable. Its only dependencies are state setters, which never change.
  const close = useCallback((): void => {
    setIsOpen(false);
    setQuery('');
  }, [setQuery]);

  function moveTo(index: number): void {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  }

  function selectIndex(index: number): void {
    const item = items[index];
    if (item === undefined || item.disabled === true) {
      return;
    }
    close();
    onSelect(item.id);
  }

  // Popover calls this on close. A Tab target is used once, then the trigger is the default.
  function returnFocus(): HTMLElement | null {
    const target = tabStopRef.current;
    tabStopRef.current = null;
    return target;
  }

  function handleTriggerClick(): void {
    if (isOpen) {
      close();
      return;
    }
    open(firstEnabledIndex(items));
  }

  // Arrow keys open the list from the trigger. Enter and Space reach the trigger as a click.
  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (event.key === LIST_KEY.arrowDown) {
      event.preventDefault();
      open(firstEnabledIndex(items));
    } else if (event.key === LIST_KEY.arrowUp) {
      event.preventDefault();
      open(lastEnabledIndex(items));
    }
  }

  function handleListKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key === LIST_KEY.tab) {
      event.preventDefault();
      tabStopRef.current =
        anchor === null
          ? null
          : findTabStop(anchor, event.currentTarget.closest('[role="dialog"]'), event.shiftKey);
      close();
      return;
    }
    if (event.key === LIST_KEY.enter || event.key === LIST_KEY.space) {
      event.preventDefault();
      selectIndex(activeIndex);
      return;
    }
    const target = navigationTarget(items, activeIndex, event.key);
    if (target !== undefined) {
      event.preventDefault();
      if (target >= 0) {
        moveTo(target);
      }
      return;
    }
    if (isTypeaheadKey(event)) {
      const nextQuery = `${query}${event.key}`;
      setQuery(nextQuery);
      const match = typeaheadTarget(items, nextQuery, activeIndex);
      if (match !== undefined) {
        moveTo(match);
      }
    }
  }

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={trigger.kind === 'icon' ? label : undefined}
        className={
          trigger.kind === 'icon'
            ? 'ds-button ds-button--subtle ds-icon-button'
            : 'ds-button ds-button--subtle'
        }
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        {trigger.kind === 'icon' ? <Icon name={trigger.icon} /> : trigger.text}
      </button>
      <Popover
        anchor={anchor}
        open={isOpen}
        onClose={close}
        label={label}
        role="presentation"
        returnFocusTo={returnFocus}
      >
        <div role="menu" aria-label={label} className="ds-menu" onKeyDown={handleListKeyDown}>
          {items.map((item, index) => {
            const isDisabled = item.disabled === true;
            return (
              <div
                key={item.id}
                ref={(element: HTMLDivElement | null) => {
                  itemRefs.current[index] = element;
                }}
                role="menuitem"
                tabIndex={index === activeIndex ? 0 : -1}
                aria-disabled={isDisabled ? 'true' : undefined}
                className="ds-menu__item"
                onFocus={() => {
                  if (!isDisabled) {
                    setActiveIndex(index);
                  }
                }}
                // A disabled item keeps focus where it is: no focus move, no roving index change.
                onMouseDown={(event) => {
                  if (isDisabled) {
                    event.preventDefault();
                  }
                }}
                onClick={() => {
                  selectIndex(index);
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
