import type { AIProvider, ProviderRequest, ProviderResult } from './provider';

// Test-only. Answers from a queue of scripted results and records every request it receives.
// Running out of script is a bug in the test, so it throws instead of inventing an answer.
export interface FakeProvider extends AIProvider {
  readonly requests: readonly ProviderRequest[];
}

export const createFakeProvider = (script: readonly ProviderResult[]): FakeProvider => {
  const queue = [...script];
  const requests: ProviderRequest[] = [];

  return {
    requests,
    complete: (request) => {
      requests.push(request);
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('FakeProvider: no scripted result left');
      }
      return Promise.resolve(next);
    },
  };
};
