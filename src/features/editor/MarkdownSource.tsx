import type { JSX } from 'react';
import './MarkdownSource.css';

export interface MarkdownSourceProps {
  // The raw Markdown being edited (D15).
  value: string;
  onChange: (markdown: string) => void;
}

// D15: a plain textarea holding the document's Markdown. Its text is parsed back into the editor
// when the user returns to the Visual view.
export function MarkdownSource({ value, onChange }: MarkdownSourceProps): JSX.Element {
  return (
    <textarea
      className="markdown-source"
      aria-label="Markdown source"
      spellCheck={false}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}
