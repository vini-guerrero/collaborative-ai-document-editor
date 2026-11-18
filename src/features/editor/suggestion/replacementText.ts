// T2, T10: a replacement is one paragraph of text. A line break would become Markdown structure
// after a reload, so breaks are flattened to single spaces once, when the round is received. The
// preview and Accept both read that flattened text, so they always match.
export function flattenReplacement(text: string): string {
  return text.replace(/\s*\n+\s*/g, ' ').trim();
}
