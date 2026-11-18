import { useState, type JSX } from 'react';
import { Button, TextField } from '@/design-system';
import { MAX_ANSWER_CHARS } from '@shared/schemas';

export interface FlagAnswerFormProps {
  onAnswer: (answer: string) => void;
}

// For question flags (D3): the author answers the AI's question. The text stays in this field
// only until it is sent; the document is not changed here.
export function FlagAnswerForm({ onAnswer }: FlagAnswerFormProps): JSX.Element {
  const [answer, setAnswer] = useState('');
  const trimmed = answer.trim();
  return (
    <form
      className="flag-answer"
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed !== '') {
          onAnswer(trimmed);
        }
      }}
    >
      <TextField
        label="Your answer"
        maxLength={MAX_ANSWER_CHARS}
        value={answer}
        onChange={(event) => {
          setAnswer(event.target.value);
        }}
      />
      <Button type="submit" disabled={trimmed === ''}>
        Send answer
      </Button>
    </form>
  );
}
