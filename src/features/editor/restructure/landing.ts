// D10, D11: where a moved section lands. `to` is its final index in the result, so the section
// it lands before is the one at `to` in the list with `from` removed. Returns that section's
// index in the current outline, or null when the moved section ends up last.
export function landingSectionIndex(count: number, from: number, to: number): number | null {
  const restLength = count - 1;
  if (to >= restLength) return null;
  return to < from ? to : to + 1;
}
