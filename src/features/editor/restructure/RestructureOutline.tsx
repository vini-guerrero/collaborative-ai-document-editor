import type { JSX } from 'react';
import { sectionTitle } from './describeOperation';
import type { Section } from './sections';
import './restructure.css';

export interface RestructureOutlineProps {
  sections: readonly Section[];
}

export interface OutlineRow {
  // Character offset of the section in the document: unique and stable for a given text.
  readonly key: string;
  readonly title: string;
  readonly level: number;
}

const TOP_LEVEL = 1;

// Offsets are read from the section texts, which concatenate back to the document (D10).
export function outlineRows(sections: readonly Section[]): OutlineRow[] {
  let offset = 0;
  return sections.map((section) => {
    const row: OutlineRow = {
      key: String(offset),
      title: sectionTitle(section),
      level: section.level ?? TOP_LEVEL,
    };
    offset += section.text.length;
    return row;
  });
}

// D10: a read-only outline of the document's sections, indented by heading level.
export function RestructureOutline({ sections }: RestructureOutlineProps): JSX.Element {
  if (sections.length === 0) {
    return <p className="restructure-outline__empty">No sections yet.</p>;
  }
  return (
    <nav aria-label="Document outline">
      <ol className="restructure-outline">
        {outlineRows(sections).map((row) => (
          <li
            key={row.key}
            className={`restructure-outline__item restructure-outline__item--level-${String(row.level)}`}
          >
            {row.title}
          </li>
        ))}
      </ol>
    </nav>
  );
}
