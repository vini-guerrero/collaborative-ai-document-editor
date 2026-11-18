import type { JSX, ReactNode } from 'react';
import { Icon, Lozenge, Spinner } from '@/design-system';
import type { AiStatus } from './aiStatus';
import { useAiStatus } from './AiStatusContext';
import './StatusIndicator.css';

// D14: neutral, factual one-liners (D8). Each state has an icon too, so color is not the only
// cue (S7).
const STATUS_LABELS: Record<AiStatus, string> = {
  ready: 'AI ready',
  working: 'AI is working',
  unavailable: 'AI unavailable. Retry later',
  out_of_credit: 'AI is out of credit',
};

// The spinner is its own status region, so its label is empty to avoid announcing twice.
const iconFor = (status: AiStatus): ReactNode => {
  switch (status) {
    case 'ready':
      return <Icon name="check" />;
    case 'working':
      return <Spinner label="" />;
    case 'unavailable':
    case 'out_of_credit':
      return <Icon name="x" />;
  }
};

export function StatusIndicator(): JSX.Element {
  const status = useAiStatus();
  return (
    <Lozenge>
      <span className="ai-status__icon">{iconFor(status)}</span>
      <span role="status" aria-live="polite">
        {STATUS_LABELS[status]}
      </span>
    </Lozenge>
  );
}
