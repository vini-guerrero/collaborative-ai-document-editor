import type { Node } from '@tiptap/pm/model';
import { fnv1a32 } from '@/lib/hash';
import type { Suggestion } from './suggestionState';

// The text one rewrite works on: a range inside one textblock, quoted exactly (T10). It is read from
// the editor when a rewrite starts, so the request and the preview see the same text (D5, D6).
export interface RewriteTarget {
  readonly from: number;
  readonly to: number;
  readonly quote: string;
  // The whole textblock text, sent as context with the quote (T5).
  readonly paragraph: string;
  readonly blockHash: string;
  // The flag this rewrite answers. Accept also drops that flag. Undefined for selections (D9).
  readonly flagId: string | undefined;
  // The card heading, such as "Clarity" or "Selected Text". Plain text, never markup (T10).
  readonly title: string;
  // Text under the heading, such as a flag's reason. Undefined when there is none.
  readonly detail: string | undefined;
}

export interface RangeLike {
  readonly from: number;
  readonly to: number;
}

export interface TargetMeta {
  readonly title: string;
  readonly detail: string | undefined;
  readonly flagId: string | undefined;
}

// Null unless the range is non-empty text inside one textblock; such a range cannot be quoted.
export function rewriteTargetOf(
  doc: Node,
  range: RangeLike,
  meta: TargetMeta,
): RewriteTarget | null {
  const { from, to } = range;
  if (from >= to || to > doc.content.size) {
    return null;
  }
  const $from = doc.resolve(from);
  const $to = doc.resolve(to);
  if (!$from.parent.isTextblock || !$from.sameParent($to)) {
    return null;
  }
  const paragraph = $from.parent.textContent;
  return {
    from,
    to,
    quote: doc.textBetween(from, to),
    paragraph,
    blockHash: fnv1a32(paragraph),
    ...meta,
  };
}

// The preview for one round of a target. Optional fields are only set when present (exact optional
// types), so the plugin's strict schema accepts it.
export function suggestionFor(target: RewriteTarget, replacement: string): Suggestion {
  const base: Suggestion = {
    from: target.from,
    to: target.to,
    quote: target.quote,
    replacement,
    blockHash: target.blockHash,
  };
  return target.flagId === undefined ? base : { ...base, flagId: target.flagId };
}
