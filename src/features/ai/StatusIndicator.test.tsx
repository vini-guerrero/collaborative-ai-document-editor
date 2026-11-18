import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAiClient } from './client';
import { createAiStatusStore, type AiOutcome } from './aiStatus';
import { AiStatusProvider } from './AiStatusContext';
import { StatusIndicator } from './StatusIndicator';

// D14 / S7: every state shows its text and an icon, so color is never the only cue.
const renderIndicator = () => {
  const store = createAiStatusStore();
  const client = createAiClient({ fetchImpl: () => Promise.reject(new TypeError('offline')) });
  const view = render(
    <AiStatusProvider client={client} store={store}>
      <StatusIndicator />
    </AiStatusProvider>,
  );
  const settle = (outcome: AiOutcome): void => {
    act(() => {
      store.begin();
      store.end(outcome);
    });
  };
  return { ...view, store, settle };
};

const OUT_OF_CREDIT: AiOutcome = { ok: false, error: { kind: 'out_of_credit' } };
const UNAVAILABLE: AiOutcome = { ok: false, error: { kind: 'unavailable' } };

describe('StatusIndicator (D14, S7)', () => {
  it('shows "AI ready" with an icon when idle', () => {
    const { container } = renderIndicator();

    expect(screen.getByText('AI ready')).not.toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('shows "AI is working" with a spinner while a request is in flight', () => {
    const { container, store } = renderIndicator();

    act(() => {
      store.begin();
    });

    expect(screen.getByText('AI is working')).not.toBeNull();
    expect(container.querySelector('.ds-spinner')).not.toBeNull();
  });

  it('shows the retry message with an icon when the AI is unavailable', () => {
    const { container, settle } = renderIndicator();

    settle(UNAVAILABLE);

    expect(screen.getByText('AI unavailable. Retry later')).not.toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('shows the out-of-credit message with an icon and keeps it after a later success', () => {
    const { container, settle } = renderIndicator();

    settle(OUT_OF_CREDIT);
    settle({ ok: true });

    expect(screen.getByText('AI is out of credit')).not.toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('announces the label through a polite status region', () => {
    renderIndicator();

    const status = screen.getByText('AI ready');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });
});
