import { z } from 'zod';

// The model names the server is configured with, so the app can say which model is answering.
// Names are configuration read by the server (T7); the browser only displays them.
export const ServerInfoSchema = z
  .object({
    models: z
      .object({
        analyze: z.string(),
        rewrite: z.string(),
        restructure: z.string(),
      })
      .strict(),
  })
  .strict();

export type ServerInfo = z.infer<typeof ServerInfoSchema>;
