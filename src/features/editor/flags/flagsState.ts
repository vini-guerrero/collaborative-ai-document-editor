import type { Node } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { z } from 'zod';
import { fnv1a32 } from '@/lib/hash';
import {
  FlagSchema,
  MAX_FLAGS_PER_PARAGRAPH,
  type Flag,
  type FlagKind,
} from '@shared/schemas/flag';
import { readTextblock } from './flagText';

export interface FlagEntry {
  readonly id: string;
  readonly kind: FlagKind;
  readonly reason: string;
  readonly quote: string;
  readonly from: number;
  readonly to: number;
  // fnv1a32 of the textblock text the AI computed the flag on (D4, D16).
  readonly blockHash: string;
}

// A flag the author dismissed. It stays dismissed while its block keeps this text (D4, D16): the
// analyzer may propose it again, but only for the same block hash and quote.
export interface DismissedFlag {
  readonly blockHash: string;
  readonly quote: string;
}

export interface FlagsState {
  readonly entries: readonly FlagEntry[];
  // Next id to hand out. Kept in state so ids stay unique without module-level mutation.
  readonly nextId: number;
  // Bounded (AGENTS: bound everything); pruned when a block's text changes.
  readonly dismissed: readonly DismissedFlag[];
}

const MAX_DISMISSED_FLAGS = 50;

export interface SetFlagsInput {
  readonly paragraphPos: number;
  readonly blockHash: string;
  readonly flags: readonly Flag[];
}

export type FlagsMeta = ({ readonly type: 'set' } & SetFlagsInput) | ClearFlagsMeta;

export interface ClearFlagsMeta {
  readonly type: 'clear';
  readonly id: string | undefined;
}

export const EMPTY_FLAGS: FlagsState = { entries: [], nextId: 1, dismissed: [] };

function isDismissed(
  dismissed: readonly DismissedFlag[],
  blockHash: string,
  quote: string,
): boolean {
  return dismissed.some((entry) => entry.blockHash === blockHash && entry.quote === quote);
}

// Forgets dismissals whose block text no longer exists in the document (the block changed).
function pruneDismissed(dismissed: readonly DismissedFlag[], doc: Node): readonly DismissedFlag[] {
  if (dismissed.length === 0) {
    return dismissed;
  }
  const liveHashes = new Set<string>();
  doc.descendants((node) => {
    if (node.isTextblock) {
      liveHashes.add(fnv1a32(node.textContent));
      return false;
    }
    return true;
  });
  return dismissed.filter((entry) => liveHashes.has(entry.blockHash));
}

// A flag stays valid while its range is non-empty, lies in one textblock whose text is unchanged
// since the AI computed it (T3, D4), and still reads as its quote.
export function isFlagEntryValid(entry: FlagEntry, doc: Node): boolean {
  if (entry.from < 0 || entry.from >= entry.to || entry.to > doc.content.size) {
    return false;
  }
  const $from = doc.resolve(entry.from);
  const $to = doc.resolve(entry.to);
  if (!$from.parent.isTextblock || !$from.sameParent($to)) {
    return false;
  }
  if (fnv1a32($from.parent.textContent) !== entry.blockHash) {
    return false;
  }
  return doc.textBetween(entry.from, entry.to) === entry.quote;
}

// Maps every range through the transaction and drops the ones that no longer hold. Insertions
// at a flag's start stay outside it; insertions at its end do not extend it.
export function mapFlags(state: FlagsState, tr: Transaction): FlagsState {
  const entries = state.entries
    .map((entry) => ({
      ...entry,
      from: tr.mapping.map(entry.from, 1),
      to: tr.mapping.map(entry.to, -1),
    }))
    .filter((entry) => isFlagEntryValid(entry, tr.doc));
  return { ...state, entries, dismissed: pruneDismissed(state.dismissed, tr.doc) };
}

function locateQuote(
  text: string,
  positions: readonly number[],
  quote: string,
): { from: number; to: number } | null {
  const index = text.indexOf(quote);
  if (quote.length === 0 || index < 0) {
    return null;
  }
  const first = positions[index];
  const last = positions[index + quote.length - 1];
  if (first === undefined || last === undefined) {
    return null;
  }
  return { from: first, to: last + 1 };
}

// Replaces the flags of one paragraph. Flags computed on other text (blockHash mismatch) are
// stale and ignored; quotes that are not in the paragraph are ignored; at most
// MAX_FLAGS_PER_PARAGRAPH are kept, in the order given (D16).
export function applySetFlags(state: FlagsState, doc: Node, input: SetFlagsInput): FlagsState {
  const { paragraphPos, blockHash, flags } = input;
  if (paragraphPos < 0) {
    return state;
  }
  const block = doc.nodeAt(paragraphPos);
  if (block?.isTextblock !== true) {
    return state;
  }
  const { text, positions } = readTextblock(block, paragraphPos + 1);
  if (fnv1a32(text) !== blockHash) {
    return state;
  }
  const blockEnd = paragraphPos + block.nodeSize;
  const created: FlagEntry[] = [];
  let nextId = state.nextId;
  for (const flag of flags) {
    if (created.length >= MAX_FLAGS_PER_PARAGRAPH) {
      break;
    }
    if (isDismissed(state.dismissed, blockHash, flag.quote)) {
      continue;
    }
    const range = locateQuote(text, positions, flag.quote);
    if (range === null) {
      continue;
    }
    created.push({
      id: `flag-${String(nextId)}`,
      kind: flag.kind,
      reason: flag.reason,
      quote: flag.quote,
      from: range.from,
      to: range.to,
      blockHash,
    });
    nextId += 1;
  }
  const others = state.entries.filter(
    (entry) => entry.from < paragraphPos || entry.from >= blockEnd,
  );
  return { entries: [...others, ...created], nextId, dismissed: state.dismissed };
}

// Clearing one flag by id is a dismissal, so the same flag is not shown again for this text.
// Clearing every flag is not (it is used when the document is reset).
export function applyClearFlags(state: FlagsState, id: string | undefined): FlagsState {
  if (id === undefined) {
    return { ...state, entries: [] };
  }
  const dismissedNow = state.entries.filter((entry) => entry.id === id);
  const added = dismissedNow.map((entry) => ({ blockHash: entry.blockHash, quote: entry.quote }));
  return {
    ...state,
    entries: state.entries.filter((entry) => entry.id !== id),
    dismissed: [...state.dismissed, ...added].slice(-MAX_DISMISSED_FLAGS),
  };
}

// Plugin meta arrives as unknown; only shapes this module writes are accepted.
export function readFlagsMeta(raw: unknown): FlagsMeta | undefined {
  if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
    return undefined;
  }
  if (raw.type === 'clear') {
    return 'id' in raw && typeof raw.id === 'string'
      ? { type: 'clear', id: raw.id }
      : { type: 'clear', id: undefined };
  }
  if (
    raw.type === 'set' &&
    'paragraphPos' in raw &&
    typeof raw.paragraphPos === 'number' &&
    'blockHash' in raw &&
    typeof raw.blockHash === 'string' &&
    'flags' in raw &&
    Array.isArray(raw.flags)
  ) {
    const flags = z.array(FlagSchema).safeParse(raw.flags);
    if (!flags.success) {
      return undefined;
    }
    return {
      type: 'set',
      paragraphPos: raw.paragraphPos,
      blockHash: raw.blockHash,
      flags: flags.data,
    };
  }
  return undefined;
}
