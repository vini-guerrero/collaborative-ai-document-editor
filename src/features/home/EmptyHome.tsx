import type { JSX } from 'react';
import { Button, EmptyState } from '@/design-system';

export interface EmptyHomeProps {
  onNewDocument: () => void;
}

// H6: an invitation, not sample content. The first document the user sees is their own.
export function EmptyHome({ onNewDocument }: EmptyHomeProps): JSX.Element {
  return (
    <EmptyState
      title="Start Your First Document"
      action={
        <Button variant="primary" onClick={onNewDocument}>
          New Document
        </Button>
      }
    />
  );
}
