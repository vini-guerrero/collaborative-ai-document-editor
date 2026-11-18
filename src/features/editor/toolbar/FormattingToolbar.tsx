import { useState, type JSX, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import { Icon, Tooltip } from '@/design-system';
import { FORMATTING_GROUPS } from './formattingControls';
import './FormattingToolbar.css';

export interface FormattingToolbarProps {
  editor: Editor;
}

const CONTROL_COUNT = FORMATTING_GROUPS.flat().length;
// The flat position of each group's first control, so a button's tab index needs no counter.
const GROUP_OFFSETS = FORMATTING_GROUPS.map((_, group) =>
  FORMATTING_GROUPS.slice(0, group).reduce((total, previous) => total + previous.length, 0),
);

interface ControlState {
  active: boolean[];
  enabled: boolean[];
}

const sameState = (a: ControlState, b: ControlState): boolean =>
  a.active.every((value, index) => value === b.active[index]) &&
  a.enabled.every((value, index) => value === b.enabled[index]);

// What the buttons show, read once per transaction: which formats are on and which can run.
function stateOf(editor: Editor): ControlState {
  const controls = FORMATTING_GROUPS.flat();
  return {
    active: controls.map((control) => control.isActive?.(editor) ?? false),
    enabled: controls.map((control) => control.canRun(editor)),
  };
}

// S4, S9: the formatting controls of the Visual editor, in one ARIA toolbar. One button is in the
// Tab order and the arrow keys move between the rest (roving tabindex), so the toolbar costs one
// Tab stop. Buttons keep the editor focused and the selection intact (D17).
export function FormattingToolbar({ editor }: FormattingToolbarProps): JSX.Element {
  const [focusIndex, setFocusIndex] = useState(0);
  const { active, enabled } = useEditorState({
    editor,
    selector: ({ editor: current }) => stateOf(current),
    equalityFn: (a, b) => b !== null && sameState(a, b),
  });

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const next = (focusIndex + step + CONTROL_COUNT) % CONTROL_COUNT;
    setFocusIndex(next);
    event.currentTarget.querySelectorAll<HTMLElement>('button')[next]?.focus();
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="formatting-toolbar"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      {FORMATTING_GROUPS.map((group, groupIndex) => (
        <div key={group[0]?.id} role="group" className="formatting-toolbar__group">
          {group.map((control, controlIndex) => {
            const position = (GROUP_OFFSETS[groupIndex] ?? 0) + controlIndex;
            const pressed = control.isActive === undefined ? undefined : active[position] === true;
            return (
              <Tooltip key={control.id} content={control.label}>
                <button
                  type="button"
                  aria-label={control.label}
                  aria-pressed={pressed}
                  disabled={enabled[position] !== true}
                  tabIndex={position === focusIndex ? 0 : -1}
                  className="formatting-toolbar__button"
                  onFocus={() => {
                    setFocusIndex(position);
                  }}
                  onClick={() => {
                    control.run(editor);
                  }}
                >
                  <Icon name={control.icon} />
                </button>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </div>
  );
}
