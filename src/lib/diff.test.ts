import { describe, expect, it } from 'vitest';
import { diffWords, type DiffOp } from './diff';

const PAIRS: [string, string][] = [
  ['', ''],
  ['', 'new text'],
  ['old text', ''],
  ['hello world', 'hello world'],
  ['hello', 'hello world'],
  ['hello world', 'hello'],
  ['the cat sat', 'the dog sat'],
  ['café au lait', 'cafe au lait'],
  ['naïve Zoë', 'naive Zoe'],
  ['hi 🌍 there', 'hi 🌎 there'],
  ['a b', 'a  b'],
  ['line one\nline two', 'line one\n\nline two'],
  ['tab\there', 'tab here'],
  ['Hello, world.', 'Hello world!'],
  ['multi   space  run', 'multi space run'],
];

// T3/T10: callers rely on these two reconstruction invariants, so they are checked on every pair.
const textOf = (ops: readonly DiffOp[], keep: 'before' | 'after'): string =>
  ops
    .filter((op) => op.kind === 'equal' || op.kind === (keep === 'before' ? 'delete' : 'insert'))
    .map((op) => op.text)
    .join('');

describe('diffWords reconstruction invariants (T3, T10)', () => {
  it.each(PAIRS)('rebuilds before and after exactly for %j -> %j', (before, after) => {
    const ops = diffWords(before, after);
    expect(textOf(ops, 'before')).toBe(before);
    expect(textOf(ops, 'after')).toBe(after);
  });

  it.each(PAIRS)(
    'never returns empty ops or adjacent ops of the same kind for %j -> %j',
    (before, after) => {
      const ops = diffWords(before, after);
      ops.forEach((op, index) => {
        expect(op.text).not.toBe('');
        if (index > 0) {
          expect(op.kind).not.toBe(ops[index - 1]?.kind);
        }
      });
    },
  );

  it('keeps whitespace between tokens (diffWords would have dropped the double space)', () => {
    const ops = diffWords('a  b', 'a b');
    expect(textOf(ops, 'before')).toBe('a  b');
    expect(textOf(ops, 'after')).toBe('a b');
  });
});

describe('diffWords ops', () => {
  it('returns no ops for two empty strings', () => {
    expect(diffWords('', '')).toEqual([]);
  });

  it('returns one equal op for identical text', () => {
    expect(diffWords('hello world', 'hello world')).toEqual([
      { kind: 'equal', text: 'hello world' },
    ]);
  });

  it('reports pure insertion at the end', () => {
    expect(diffWords('hello', 'hello world')).toEqual([
      { kind: 'equal', text: 'hello' },
      { kind: 'insert', text: ' world' },
    ]);
  });

  it('reports pure insertion into empty text', () => {
    expect(diffWords('', 'new text')).toEqual([{ kind: 'insert', text: 'new text' }]);
  });

  it('reports pure deletion at the end', () => {
    expect(diffWords('hello world', 'hello')).toEqual([
      { kind: 'equal', text: 'hello' },
      { kind: 'delete', text: ' world' },
    ]);
  });

  it('reports pure deletion of all text', () => {
    expect(diffWords('old text', '')).toEqual([{ kind: 'delete', text: 'old text' }]);
  });

  it('reports a word replacement as delete then insert', () => {
    expect(diffWords('the cat sat', 'the dog sat')).toEqual([
      { kind: 'equal', text: 'the ' },
      { kind: 'delete', text: 'cat' },
      { kind: 'insert', text: 'dog' },
      { kind: 'equal', text: ' sat' },
    ]);
  });

  it('diffs accented letters as whole words', () => {
    expect(diffWords('café', 'cafe')).toEqual([
      { kind: 'delete', text: 'café' },
      { kind: 'insert', text: 'cafe' },
    ]);
  });

  it('diffs emoji as one character, not as broken surrogates', () => {
    expect(diffWords('hi 🌍', 'hi 🌎')).toEqual([
      { kind: 'equal', text: 'hi ' },
      { kind: 'delete', text: '🌍' },
      { kind: 'insert', text: '🌎' },
    ]);
  });

  it('reports a whitespace-only change as an op with no visible text', () => {
    const ops = diffWords('a b', 'a  b');
    const whitespaceOps = ops.filter((op) => op.kind !== 'equal');
    expect(whitespaceOps.length).toBeGreaterThan(0);
    expect(whitespaceOps.every((op) => op.text.trim() === '')).toBe(true);
  });

  it('reports a punctuation-only change without touching the words', () => {
    const ops = diffWords('Hello, world.', 'Hello world!');
    const changed = ops.filter((op) => op.kind !== 'equal').map((op) => op.text);
    expect(changed.join('')).toMatch(/[,.!]/);
    expect(changed.join('')).not.toMatch(/Hello|world/);
  });

  it('keeps a newline change inside the ops', () => {
    expect(textOf(diffWords('line one\nline two', 'line one\n\nline two'), 'after')).toBe(
      'line one\n\nline two',
    );
  });
});
