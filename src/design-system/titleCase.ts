// Capitalizes the first letter of each word, for tooltip text derived from a sentence-case label
// ("More actions" becomes "More Actions"). Labels that carry user text pass their own tooltip.
export function titleCase(text: string): string {
  return text.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}
