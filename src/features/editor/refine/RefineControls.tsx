import { useState, type JSX, type SyntheticEvent } from 'react';
import { Button, Select, Spinner, TextField } from '@/design-system';
import type { Length, Tone } from '@shared/schemas/rewrite';
import {
  LENGTH_OPTIONS,
  TONE_OPTIONS,
  instructionPlaceholder,
  isLength,
  isTone,
} from './refineOptions';
import './RefineControls.css';

export interface RefineControlsProps {
  tone: Tone;
  length: Length;
  // "1 / 3", or empty before the first request.
  roundLabel: string;
  canStepBack: boolean;
  canStepForward: boolean;
  // Characters left for one new instruction; the input cannot take more.
  instructionBudget: number;
  // True while a request is in flight. Blocks a second instruction.
  busy: boolean;
  onToneChange: (tone: Tone) => void;
  onLengthChange: (length: Length) => void;
  onInstruction: (text: string) => void;
  onStepBack: () => void;
  onStepForward: () => void;
}

// D6: tone and length dropdowns, a free instruction, and back and forward through the rounds.
// Props and callbacks only; the caller dispatches to the reducer and makes the request.
export function RefineControls({
  tone,
  length,
  roundLabel,
  canStepBack,
  canStepForward,
  instructionBudget,
  busy,
  onToneChange,
  onLengthChange,
  onInstruction,
  onStepBack,
  onStepForward,
}: RefineControlsProps): JSX.Element {
  const [draft, setDraft] = useState('');
  const trimmed = draft.trim();
  const canSubmit = !busy && trimmed.length > 0 && trimmed.length <= instructionBudget;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>): void {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    onInstruction(trimmed);
    setDraft('');
  }

  return (
    <form className="refine" aria-label="Refine the suggestion" onSubmit={handleSubmit}>
      <div className="refine__row">
        <div className="refine__select">
          <Select
            label="Tone"
            value={tone}
            options={TONE_OPTIONS}
            onChange={(value) => {
              if (isTone(value)) {
                onToneChange(value);
              }
            }}
          />
        </div>
        <div className="refine__select">
          <Select
            label="Length"
            value={length}
            options={LENGTH_OPTIONS}
            onChange={(value) => {
              if (isLength(value)) {
                onLengthChange(value);
              }
            }}
          />
        </div>
      </div>
      <div className="refine__row">
        <div className="refine__field">
          <TextField
            label="Refine instruction"
            hideLabel
            placeholder={instructionPlaceholder(length)}
            value={draft}
            maxLength={instructionBudget}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
        </div>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {busy ? (
            // The card already announces the request; this one is only the visible cue.
            <span aria-hidden="true" className="refine__spinner">
              <Spinner label="Refining" />
            </span>
          ) : null}
          Refine
        </Button>
      </div>
      {canStepBack || canStepForward ? (
        <div className="refine__nav">
          <Button disabled={!canStepBack} onClick={onStepBack}>
            Previous
          </Button>
          <Button disabled={!canStepForward} onClick={onStepForward}>
            Next
          </Button>
          <span className="refine__count" aria-live="polite">
            {roundLabel}
          </span>
        </div>
      ) : null}
    </form>
  );
}
