import { useEffect, useState } from 'react';
import { ServerInfoSchema, type ServerInfo } from '@shared/schemas';

const INFO_URL = '/api/info';
const INFO_TIMEOUT_MS = 5_000;

// Reads which models the server uses, once. The tooltip is a nicety, so any failure (offline,
// not JSON, wrong shape) just means no model line; it never reaches the AI status (D14).
export function useModelNames(): ServerInfo['models'] | null {
  const [models, setModels] = useState<ServerInfo['models'] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(INFO_URL, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(INFO_TIMEOUT_MS)]),
        });
        const parsed = ServerInfoSchema.safeParse(await response.json());
        if (parsed.success && !controller.signal.aborted) {
          setModels(parsed.data.models);
        }
      } catch {
        // No model line is shown; the status itself does not depend on it.
      }
    })();
    return () => {
      controller.abort();
    };
  }, []);

  return models;
}

// One line when every task uses the same model, otherwise one line per task.
export function modelLines(models: ServerInfo['models']): string {
  const { analyze, rewrite, restructure } = models;
  if (analyze === rewrite && rewrite === restructure) {
    return `Model: ${analyze}`;
  }
  return `Analyze: ${analyze}\nRewrite: ${rewrite}\nRestructure: ${restructure}`;
}
