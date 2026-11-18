import type { JSX } from 'react';
import { Button } from '@/design-system';
import type { FlagKind } from '@shared/schemas';
import { FlagAnswerForm } from './FlagAnswerForm';
import type { FlagEntry } from './flags/flagsState';
import './FlagPanel.css';

// S7: the kind is named in text, so it never relies on the underline's colour alone.
export const KIND_LABELS: Record<FlagKind, string> = {
  clarity: 'Clarity',
  tone: 'Tone',
  grammar: 'Grammar',
  question: 'Question',
};

export interface FlagPanelProps {
  flag: FlagEntry;
  onDismiss: () => void;
  // Wired by later phases; the controls appear only when a handler is given.
  onViewSuggestion?: (() => void) | undefined;
  onAnswer?: ((answer: string) => void) | undefined;
}

// T10: the reason is rendered as text, never as markup.
export function FlagPanel({
  flag,
  onDismiss,
  onViewSuggestion,
  onAnswer,
}: FlagPanelProps): JSX.Element {
  return (
    <div className="flag-panel">
      <div className="flag-panel__header">
        <p className="flag-panel__kind">{KIND_LABELS[flag.kind]}</p>
        <p className="flag-panel__reason">{flag.reason}</p>
      </div>
      {onAnswer === undefined ? null : <FlagAnswerForm onAnswer={onAnswer} />}
      <div className="flag-panel__actions">
        {onViewSuggestion === undefined ? null : (
          <Button onClick={onViewSuggestion}>View suggestion</Button>
        )}
        <Button onClick={onDismiss}>Dismiss</Button>
      </div>
    </div>
  );
}
