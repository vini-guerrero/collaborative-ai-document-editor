import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { JSX } from 'react';
import { useState } from 'react';
import { createAiClient, type FetchLike } from './client';
import { createAiStatusStore } from './aiStatus';
import { AiStatusProvider, useAiClient, useAiStatus } from './AiStatusContext';
import { StatusIndicator } from './StatusIndicator';

// T9: the AI is faked at the fetch boundary. Each queued item is one proxy response.
const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const fakeProxy = (queue: Response[]) =>
  vi.fn<FetchLike>(() => {
    const next = queue.shift();
    const unqueued = jsonResponse(500, { error: { code: 'unavailable', message: 'No response.' } });
    return Promise.resolve(next ?? unqueued);
  });

// Runs one analyze request on click and shows the outcome kind, so the test can wait for it.
function AnalyzeButton(): JSX.Element {
  const client = useAiClient();
  const [result, setResult] = useState('none');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void client.run({ task: 'analyze', paragraph: 'The launch moved.' }).then((outcome) => {
            setResult(outcome.ok ? 'ok' : outcome.error.kind);
          });
        }}
      >
        Analyze
      </button>
      <p>Result: {result}</p>
    </>
  );
}

function StatusProbe(): JSX.Element {
  return <p>Probe: {useAiStatus()}</p>;
}

const renderApp = (queue: Response[]) => {
  const store = createAiStatusStore();
  const client = createAiClient({ fetchImpl: fakeProxy(queue) });
  render(
    <AiStatusProvider client={client} store={store}>
      <AnalyzeButton />
      <StatusIndicator />
    </AiStatusProvider>,
  );
};

describe('useAiClient and useAiStatus (D14)', () => {
  it('returns to ready after a tracked request succeeds', async () => {
    const user = userEvent.setup();
    renderApp([jsonResponse(200, { flags: [] })]);

    await user.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(await screen.findByText('Result: ok')).not.toBeNull();
    expect(screen.getByText('AI ready')).not.toBeNull();
  });

  it('becomes unavailable on a failed request and recovers on the next success', async () => {
    const user = userEvent.setup();
    renderApp([
      jsonResponse(503, { error: { code: 'unavailable', message: 'Down.' } }),
      jsonResponse(200, { flags: [] }),
    ]);
    const button = screen.getByRole('button', { name: 'Analyze' });

    await user.click(button);
    expect(await screen.findByText('Result: unavailable')).not.toBeNull();
    expect(screen.getByText('AI unavailable. Retry later')).not.toBeNull();

    await user.click(button);
    await waitFor(() => {
      expect(screen.getByText('AI ready')).not.toBeNull();
    });
  });

  it('stays out of credit after later successes until the page reloads (D14)', async () => {
    const user = userEvent.setup();
    renderApp([
      jsonResponse(402, { error: { code: 'out_of_credit', message: 'Out of credit.' } }),
      jsonResponse(200, { flags: [] }),
    ]);
    const button = screen.getByRole('button', { name: 'Analyze' });

    await user.click(button);
    expect(await screen.findByText('Result: out_of_credit')).not.toBeNull();

    await user.click(button);
    await waitFor(() => {
      expect(screen.getByText('Result: ok')).not.toBeNull();
    });
    expect(screen.getByText('AI is out of credit')).not.toBeNull();
  });

  it('throws a clear error when used outside an AiStatusProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<StatusProbe />)).toThrow('inside an AiStatusProvider');

    consoleError.mockRestore();
  });
});
