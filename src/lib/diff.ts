import { diffWordsWithSpace, type ChangeObject } from 'diff';

export type DiffOpKind = 'equal' | 'insert' | 'delete';

/**
 * One run of a word-level diff. Reconstruction invariants (T3, T10):
 * the concatenation of `equal` and `delete` texts, in order, is exactly `before`;
 * the concatenation of `equal` and `insert` texts, in order, is exactly `after`.
 * Adjacent ops of the same kind are merged and empty ops are never returned.
 */
export type DiffOp =
  | { readonly kind: 'equal'; readonly text: string }
  | { readonly kind: 'insert'; readonly text: string }
  | { readonly kind: 'delete'; readonly text: string };

/**
 * Word-level diff of two texts (T3: accept applies one known transaction; T10: callers
 * compare stored text, never model output). Wraps the `diff` package behind this adapter
 * so no caller imports it directly.
 * Uses `diffWordsWithSpace`, not `diffWords`: the latter drops and reshuffles whitespace
 * between tokens, which would break the reconstruction invariant above. Whitespace-only
 * changes therefore appear as their own insert or delete ops.
 * Pure and synchronous; the library has no abort option here, so callers must bound
 * input size themselves before diffing very large documents.
 */
export function diffWords(before: string, after: string): readonly DiffOp[] {
  const changes = diffWordsWithSpace(before, after);
  return mergeAdjacent(changes.map(toOp));
}

function toOp(change: ChangeObject<string>): DiffOp {
  if (change.added) {
    return { kind: 'insert', text: change.value };
  }
  if (change.removed) {
    return { kind: 'delete', text: change.value };
  }
  return { kind: 'equal', text: change.value };
}

function mergeAdjacent(ops: readonly DiffOp[]): readonly DiffOp[] {
  const merged: DiffOp[] = [];
  for (const op of ops) {
    if (op.text === '') {
      continue;
    }
    const last = merged[merged.length - 1];
    if (last?.kind === op.kind) {
      merged[merged.length - 1] = { kind: last.kind, text: last.text + op.text };
    } else {
      merged.push(op);
    }
  }
  return merged;
}
