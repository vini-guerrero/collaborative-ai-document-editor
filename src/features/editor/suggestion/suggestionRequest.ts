import type { RewriteTarget } from './rewriteTarget';

// Why a suggestion could not be shown. Mapped to plain text by the card (D14).
export type SuggestionFailure = 'out_of_credit' | 'unavailable' | 'stale';

// What the card shows for the rewrite in progress (D14). The model's text is never part of it.
export type SuggestionRequest =
  | { readonly kind: 'loading' | 'ready' | 'empty'; readonly target: RewriteTarget }
  | { readonly kind: 'error'; readonly target: RewriteTarget; readonly reason: SuggestionFailure };

// D14: an out-of-credit answer is its own message; every other failure reads as unavailable.
export function failureOf(kind: string): SuggestionFailure {
  return kind === 'out_of_credit' ? 'out_of_credit' : 'unavailable';
}
