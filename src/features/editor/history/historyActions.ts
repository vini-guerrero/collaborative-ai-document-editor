import { HISTORY_LABEL_MAX_CHARS, type HistoryEntry } from '@/features/documents';

export interface AiAcceptInput {
  id: string;
  markdown: string;
  label: string;
  now: number;
}

export interface YouCheckpointInput {
  id: string;
  markdown: string;
  now: number;
}

// The schema limits labels by UTF-16 length (String.length), so the cut is counted the same way
// and never splits a surrogate pair (emoji and other non-ASCII text stay whole).
export function trimLabel(label: string): string {
  let result = '';
  for (const char of label.trim()) {
    if (result.length + char.length > HISTORY_LABEL_MAX_CHARS) {
      break;
    }
    result += char;
  }
  return result.trimEnd();
}

// D7: an accepted AI suggestion is recorded by the AI author. An empty label is left out, so the
// timeline shows its fallback instead of a blank name.
export function aiAcceptEntry({ id, markdown, label, now }: AiAcceptInput): HistoryEntry {
  const base: HistoryEntry = { id, author: 'ai', markdown, createdAt: now };
  const trimmed = trimLabel(label);
  return trimmed.length === 0 ? base : { ...base, label: trimmed };
}

// D7: a "You" checkpoint is taken on an idle save, so it has no label of its own.
export function youCheckpointEntry({ id, markdown, now }: YouCheckpointInput): HistoryEntry {
  return { id, author: 'user', markdown, createdAt: now };
}
