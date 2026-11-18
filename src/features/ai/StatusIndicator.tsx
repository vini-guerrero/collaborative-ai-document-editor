import type { JSX, ReactNode } from 'react';
import { Icon, Spinner, Tooltip, VisuallyHidden } from '@/design-system';
import type { AiStatus } from './aiStatus';
import { useAiStatus } from './AiStatusContext';
import { modelLines, useModelNames } from './useModelNames';
import './StatusIndicator.css';

// D14: neutral, factual one-liners (D8). Each state has its own icon, so colour is not the only
// cue (S7). The text is the tooltip and the live-region message; the bar shows only the icon.
const STATUS_LABELS: Record<AiStatus, string> = {
  ready: 'AI Ready',
  working: 'AI Is Working',
  unavailable: 'AI Unavailable. Retry Later',
  out_of_credit: 'AI Is Out of Credit',
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
  const label = STATUS_LABELS[status];
  const models = useModelNames();
  return (
    <Tooltip content={models === null ? label : `${label}\n${modelLines(models)}`}>
      <span className={`ai-status ai-status--${status}`} tabIndex={0} role="status">
        <span className="ai-status__icon">{iconFor(status)}</span>
        <VisuallyHidden>{label}</VisuallyHidden>
      </span>
    </Tooltip>
  );
}
