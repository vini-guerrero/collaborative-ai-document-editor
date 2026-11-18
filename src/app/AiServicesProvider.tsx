import { useState, type JSX, type ReactNode } from 'react';
import {
  AiStatusProvider,
  createAiClient,
  createAiStatusStore,
  type AiClient,
  type AiStatusStore,
} from '@/features/ai';

export interface AiServicesProviderProps {
  children: ReactNode;
}

// Created once per app mount, never at import time (AGENTS: no import-time side effects). The
// client is the only path to the AI proxy (T4); the status store feeds the indicator (D14).
export function AiServicesProvider({ children }: AiServicesProviderProps): JSX.Element {
  const [client] = useState<AiClient>(() =>
    createAiClient({ fetchImpl: globalThis.fetch.bind(globalThis) }),
  );
  const [store] = useState<AiStatusStore>(createAiStatusStore);
  return (
    <AiStatusProvider client={client} store={store}>
      {children}
    </AiStatusProvider>
  );
}
