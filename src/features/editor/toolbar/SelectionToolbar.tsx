import {
  useState,
  type SyntheticEvent,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Button, Icon, TextField } from '@/design-system';
import { keepEditorSelection } from './keepSelection';
import { toolbarPosition, type Box } from './toolbarPosition';
import './SelectionToolbar.css';

export interface SelectionToolbarProps {
  // The selection in client coordinates. Null hides the toolbar.
  anchorRect: Box | null;
  // The visual viewport (window.visualViewport) in the same coordinates.
  viewport: Box;
  onRewrite: () => void;
  onFixTone: () => void;
  onShorten: () => void;
  onInstruction: (text: string) => void;
  onDismiss: () => void;
}

// D9, S9: floating actions for a selected passage. It is not a Popover: a popover moves focus into
// itself on open, which would pull focus out of the editor on every selection. It is reached by
// Tab and dismissed with Esc.
export function SelectionToolbar({
  anchorRect,
  viewport,
  onRewrite,
  onFixTone,
  onShorten,
  onInstruction,
  onDismiss,
}: SelectionToolbarProps): JSX.Element | null {
  const [draft, setDraft] = useState('');
  if (anchorRect === null) {
    return null;
  }
  const { top, left } = toolbarPosition(anchorRect, viewport);
  const trimmed = draft.trim();

  function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>): void {
    event.preventDefault();
    if (trimmed.length === 0) {
      return;
    }
    onInstruction(trimmed);
    setDraft('');
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onDismiss();
    }
  }

  return (
    <div
      role="group"
      aria-label="Selection actions"
      className="selection-toolbar"
      style={{ top, left }}
      onKeyDown={handleKeyDown}
      onMouseDown={keepEditorSelection}
    >
      <span className="selection-toolbar__mark">
        <Icon name="sparkles" />
      </span>
      <Button variant="secondary" onClick={onRewrite}>
        Rewrite
      </Button>
      <Button variant="secondary" onClick={onFixTone}>
        Fix Tone
      </Button>
      <Button variant="secondary" onClick={onShorten}>
        Shorten
      </Button>
      <span className="selection-toolbar__divider" aria-hidden="true" />
      <form className="selection-toolbar__form" onSubmit={handleSubmit}>
        <div className="selection-toolbar__field">
          <TextField
            label="Instruction"
            hideLabel
            placeholder="Ask the AI to..."
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
        </div>
        <Button variant="primary" type="submit" disabled={trimmed.length === 0}>
          Apply
        </Button>
      </form>
    </div>
  );
}
