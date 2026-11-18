import { createContext, useContext, useSyncExternalStore } from 'react';
import type { JSX, ReactNode } from 'react';
import type { AiClient, AiRequestOf } from './client';
import type { AiStatus, AiStatusStore } from './aiStatus';
import type { AiTask } from '@shared/schemas';

interface AiServices {
  client: AiClient;
  status: AiStatusStore;
}

// No default: a feature outside the provider fails loudly instead of calling a client nobody
// configured (T6, dependencies injected at the edge).
const AiServicesContext = createContext<AiServices | null>(null);

export interface AiStatusProviderProps {
  client: AiClient;
  store: AiStatusStore;
  children: ReactNode;
}

export function AiStatusProvider({ client, store, children }: AiStatusProviderProps): JSX.Element {
  return (
    <AiServicesContext.Provider value={{ client, status: store }}>
      {children}
    </AiServicesContext.Provider>
  );
}

const useAiServices = (): AiServices => {
  const services = useContext(AiServicesContext);
  if (services === null) {
    throw new Error('AI hooks must be used inside an AiStatusProvider');
  }
  return services;
};

export function useAiStatus(): AiStatus {
  const { status } = useAiServices();
  return useSyncExternalStore(status.subscribe, status.getSnapshot);
}

// The client handed to features tracks every request, so the indicator follows all AI calls
// without each feature reporting its own status.
export function useAiClient(): AiClient {
  const { client, status } = useAiServices();
  return {
    run: <T extends AiTask>(request: AiRequestOf<T>, signal?: AbortSignal) =>
      status.track(client.run(request, signal)),
  };
}
