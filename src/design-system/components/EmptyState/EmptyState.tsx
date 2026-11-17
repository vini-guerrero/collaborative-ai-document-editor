import { useId, type JSX, type ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  description?: string;
  // Usually one button that names the next step, for example "Create document".
  action?: ReactNode;
}

// S4 and H6: shown when a list has no items. The title is always a level 2 heading.
export function EmptyState({ title, description, action }: EmptyStateProps): JSX.Element {
  const titleId = useId();
  const hasDescription = description !== undefined && description.length > 0;
  const hasAction = action !== undefined && action !== null;

  return (
    <section className="ds-empty-state" aria-labelledby={titleId}>
      <h2 id={titleId} className="ds-empty-state__title">
        {title}
      </h2>
      {hasDescription ? <p className="ds-empty-state__description">{description}</p> : null}
      {hasAction ? <div className="ds-empty-state__action">{action}</div> : null}
    </section>
  );
}
