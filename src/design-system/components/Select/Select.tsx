import {
  useCallback,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Icon } from '../../icons';
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
import { useTypeaheadQuery } from '../list/useTypeaheadQuery';
import './Select.css';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SelectProps {
  // Accessible name of the field, for example "Tone". Shown with the value in the trigger's name.
  label: string;
  // Shown in the trigger while the value matches no option. Defaults to the label.
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
}

// D6, S5, S9: a single-choice dropdown. The trigger shows the label of the selected option. A value
// that matches no option shows the placeholder and marks no option; the first enabled option is
// still reachable by keyboard.
export function Select({
  label,
  placeholder = label,
  value,
  onChange,
  options,
}: SelectProps): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useTypeaheadQuery();
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Set when Tab closes the list, so focus lands on the next control rather than the trigger.
  const tabStopRef = useRef<HTMLElement | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedLabel = options[selectedIndex]?.label ?? null;

  function open(index: number): void {
    setActiveIndex(index);
    setIsOpen(true);
  }

  // Opening starts on the selected option, or on the first enabled one if the selection is not
  // available.
  function openOnSelection(): void {
    const selected = options[selectedIndex];
    const isSelectable = selected !== undefined && selected.disabled !== true;
    open(isSelectable ? selectedIndex : firstEnabledIndex(options));
  }

  // Popover re-subscribes its document listeners whenever onClose changes, so close is kept
  // stable. Its only dependencies are state setters, which never change.
  const close = useCallback((): void => {
    setIsOpen(false);
    setQuery('');
  }, [setQuery]);

  function moveTo(index: number): void {
    setActiveIndex(index);
    optionRefs.current[index]?.focus();
  }

  function choose(index: number): void {
    const option = options[index];
    if (option === undefined || option.disabled === true) {
      return;
    }
    close();
    onChange(option.value);
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
    openOnSelection();
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (event.key === LIST_KEY.arrowDown) {
      event.preventDefault();
      openOnSelection();
    } else if (event.key === LIST_KEY.arrowUp) {
      event.preventDefault();
      open(lastEnabledIndex(options));
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
      choose(activeIndex);
      return;
    }
    const target = navigationTarget(options, activeIndex, event.key);
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
      const match = typeaheadTarget(options, nextQuery, activeIndex);
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
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={selectedLabel === null ? label : `${label}: ${selectedLabel}`}
        className="ds-select__trigger"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          className={
            selectedLabel === null
              ? 'ds-select__value ds-select__value--placeholder'
              : 'ds-select__value'
          }
        >
          {selectedLabel ?? placeholder}
        </span>
        <span className="ds-select__chevron" aria-hidden="true" />
      </button>
      <Popover
        anchor={anchor}
        open={isOpen}
        onClose={close}
        label={label}
        role="presentation"
        returnFocusTo={returnFocus}
      >
        <div
          role="listbox"
          aria-label={label}
          className="ds-select__list"
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, index) => {
            const isDisabled = option.disabled === true;
            const isSelected = index === selectedIndex;
            return (
              <div
                key={option.value}
                ref={(element: HTMLDivElement | null) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled ? 'true' : undefined}
                tabIndex={index === activeIndex ? 0 : -1}
                className="ds-select__option"
                onFocus={() => {
                  if (!isDisabled) {
                    setActiveIndex(index);
                  }
                }}
                // A disabled option keeps focus where it is: no focus move, no roving index change.
                onMouseDown={(event) => {
                  if (isDisabled) {
                    event.preventDefault();
                  }
                }}
                onClick={() => {
                  choose(index);
                }}
              >
                <span className="ds-select__check">
                  {isSelected ? <Icon name="check" /> : null}
                </span>
                {option.label}
              </div>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
