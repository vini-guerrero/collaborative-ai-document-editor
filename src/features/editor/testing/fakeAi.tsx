import { useState, type JSX, type ReactNode } from 'react';
import {
  AiStatusProvider,
  createAiClient,
  createAiStatusStore,
  type FetchLike,
} from '@/features/ai';
import type { Flag } from '@shared/schemas';

// T9: the AI is faked at the fetch boundary; the real client and status store run on top of it.
export const analyzeResponse = (flags: readonly Flag[]): Response =>
  new Response(JSON.stringify({ flags }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const noFlagsFetch: FetchLike = () => Promise.resolve(analyzeResponse([]));

// A fetch that stays pending until the test calls `release`, to observe the in-flight state.
export interface HeldFetch {
  fetchImpl: FetchLike;
  release: (flags: readonly Flag[]) => void;
}

export function holdingFetch(): HeldFetch {
  let settle: (response: Response) => void = () => undefined;
  const fetchImpl: FetchLike = () =>
    new Promise<Response>((resolve) => {
      settle = resolve;
    });
  return {
    fetchImpl,
    release: (flags) => {
      settle(analyzeResponse(flags));
    },
  };
}

interface AiTestProviderProps {
  fetchImpl?: FetchLike | undefined;
  children: ReactNode;
}

// Wraps a test tree with the AI services the editor needs.
export function AiTestProvider({
  fetchImpl = noFlagsFetch,
  children,
}: AiTestProviderProps): JSX.Element {
  const [client] = useState(() => createAiClient({ fetchImpl }));
  const [store] = useState(createAiStatusStore);
  return (
    <AiStatusProvider client={client} store={store}>
      {children}
    </AiStatusProvider>
  );
}
