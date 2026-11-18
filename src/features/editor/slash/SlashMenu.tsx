import type { JSX, MouseEvent } from 'react';
import { Icon } from '@/design-system';
import { slashOptionDomId, type SlashItem } from './slashItems';
import './SlashMenu.css';

// Where the menu sits, in viewport coordinates, just below the caret.
export interface SlashPosition {
  readonly top: number;
  readonly left: number;
}

export interface SlashMenuProps {
  items: readonly SlashItem[];
  // Index of the item the keyboard is on. The editor keeps focus, so the caller points
  // aria-activedescendant at slashOptionDomId(items[activeIndex].id).
  activeIndex: number;
  position: SlashPosition | null;
  onSelect: (item: SlashItem) => void;
}

// D12, S9: the slash menu list. Keys are handled by the caller through slashKeyOutcome, because
// the editor keeps focus. Pointer and touch choose an item directly. Mouse-down is prevented so
// the editor keeps its selection and focus.
export function SlashMenu({
  items,
  activeIndex,
  position,
  onSelect,
}: SlashMenuProps): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  function keepEditorFocus(event: MouseEvent<HTMLDivElement>): void {
    event.preventDefault();
  }

  const style = position === null ? undefined : { top: position.top, left: position.left };

  return (
    <div role="listbox" aria-label="AI commands" className="slash-menu" style={style}>
      {items.map((item, index) => (
        <div
          key={item.id}
          id={slashOptionDomId(item.id)}
          role="option"
          aria-selected={index === activeIndex}
          aria-disabled={item.soon === true}
          className="slash-menu__item"
          onMouseDown={keepEditorFocus}
          onClick={() => {
            onSelect(item);
          }}
        >
          <span className="slash-menu__icon">
            <Icon name={item.icon} />
          </span>
          <span className="slash-menu__text">
            {item.label}
            {item.soon === true ? (
              <small className="slash-menu__hint">Soon</small>
            ) : item.description === undefined ? null : (
              <small className="slash-menu__hint">{item.description}</small>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
