import { z } from 'zod';

// Feature-local contracts (T6, T11). The server never sees documents, so no shared/ schema.
export const CURRENT_SCHEMA_VERSION = 1 as const;

// D7: history keeps the most recent 200 entries per document.
const MAX_HISTORY_ENTRIES = 200;

const epochMs = z.number().int().nonnegative();

export const HistoryEntrySchema = z.object({
  id: z.string().min(1),
  author: z.enum(['user', 'ai']),
  markdown: z.string(),
  createdAt: epochMs,
});

export const DocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  markdown: z.string(),
  createdAt: epochMs,
  updatedAt: epochMs,
  history: z.array(HistoryEntrySchema).max(MAX_HISTORY_ENTRIES),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
});

// H4: the card preview is plain text computed at save time and kept in the index (T6).
export const DocumentSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  preview: z.string(),
  updatedAt: epochMs,
});

// The index holds one summary per document, so list() never parses full documents.
export const IndexSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  summaries: z.array(DocumentSummarySchema),
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;
export type StoredDocument = z.infer<typeof DocumentSchema>;
export type DocumentSummary = z.infer<typeof DocumentSummarySchema>;
export type StoreIndex = z.infer<typeof IndexSchema>;
