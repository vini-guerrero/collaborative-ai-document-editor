// Words that stay lowercase inside a title, as in "Go to Home" (the first word is always capitalized).
const MINOR_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
]);

// Title Case for tooltip text derived from a sentence-case label ("More actions" becomes
// "More Actions", "Switch to light theme" becomes "Switch to Light Theme"). Words are split on
// whitespace and only the first letter changes, so apostrophes and accents stay intact. Labels
// that carry user text pass their own tooltip instead.
export function titleCase(text: string): string {
  return text
    .split(' ')
    .map((word, index) => {
      if (word === '' || (index > 0 && MINOR_WORDS.has(word.toLowerCase()))) {
        return word;
      }
      const [first = '', ...rest] = Array.from(word);
      return first.toUpperCase() + rest.join('');
    })
    .join(' ');
}
