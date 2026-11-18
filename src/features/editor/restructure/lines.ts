// Line scanning for section outlines (D10). Only ATX headings count (`#` to `######`, up to
// three leading spaces). Fenced code is opaque, so a `#` line inside a fence is not a heading.

export interface ScannedLine {
  // Exact source, including its line ending. Joining `raw` reproduces the input.
  readonly raw: string;
  readonly heading: { readonly level: number; readonly title: string } | null;
  // A paragraph separator: empty and outside fenced code.
  readonly blank: boolean;
}

interface Fence {
  readonly char: string;
  readonly length: number;
}

const LINE_ENDING = /\r?\n$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const CLOSING_HASHES = /(?:^|[ \t]+)#+$/;

// Splits on "\n" and keeps each line ending, so the pieces concatenate back to the input.
export function splitLines(markdown: string): string[] {
  return markdown.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

export function textOf(lines: readonly ScannedLine[]): string {
  return lines.map((line) => line.raw).join('');
}

const closesFence = (text: string, fence: Fence): boolean => {
  const marker = FENCE_CLOSE.exec(text)?.[1];
  return marker?.startsWith(fence.char) === true && marker.length >= fence.length;
};

export function scanLines(markdown: string): ScannedLine[] {
  let fence: Fence | null = null;
  return splitLines(markdown).map((raw): ScannedLine => {
    const text = raw.replace(LINE_ENDING, '');
    if (fence !== null) {
      if (closesFence(text, fence)) fence = null;
      return { raw, heading: null, blank: false };
    }
    const marker = FENCE_OPEN.exec(text)?.[1];
    if (marker !== undefined) {
      fence = { char: marker.charAt(0), length: marker.length };
      return { raw, heading: null, blank: false };
    }
    const heading = ATX_HEADING.exec(text);
    if (heading !== null) {
      const hashes = heading[1] ?? '';
      const title = (heading[2] ?? '').replace(CLOSING_HASHES, '').trim();
      return { raw, heading: { level: hashes.length, title }, blank: false };
    }
    return { raw, heading: null, blank: text.trim() === '' };
  });
}
