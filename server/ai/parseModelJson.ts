// A reply may wrap its JSON in one ```json fence (T10). Anything else must be bare JSON.
const FENCED_JSON = /^```(?:json)?[ \t]*\n([\s\S]*?)\n?```$/;

export type ParsedReply = { readonly ok: true; readonly value: unknown } | { readonly ok: false };

// Model text is untrusted. A reply that is not JSON is an expected failure, returned as a
// typed result so the service can retry it; it is never thrown and never logged.
export const parseModelJson = (text: string): ParsedReply => {
  const trimmed = text.trim();
  const body = FENCED_JSON.exec(trimmed)?.[1] ?? trimmed;
  try {
    const value: unknown = JSON.parse(body);
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
};
