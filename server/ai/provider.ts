// The model boundary (T4). A provider adapter (phase 29) implements this; the service never
// sees HTTP, keys or provider-specific errors. Failures are typed results, not exceptions.
export interface ProviderRequest {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly maxOutputTokens: number;
  readonly signal: AbortSignal;
}

export type ProviderFailureKind = 'out_of_credit' | 'unavailable';

export type ProviderResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly kind: ProviderFailureKind };

export interface AIProvider {
  complete(request: ProviderRequest): Promise<ProviderResult>;
}
