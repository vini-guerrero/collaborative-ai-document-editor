// Plain text for the H4 card preview, derived from Markdown. Never HTML.
const DEFAULT_PREVIEW_MAX_CHARS = 160;
// Only this many code units per requested character are read, so hostile input stays cheap.
const INPUT_UNITS_PER_CHAR = 8;
const LINK_TEXT_MAX = 200;
const LINK_TARGET_MAX = 2000;
const HTML_TAG_MAX = 200;
const ELLIPSIS = '…';

const stripFences = (text: string): string => text.replace(/^\s{0,3}(?:`{3,}|~{3,}).*$/gm, '');

const stripThematicBreaks = (text: string): string =>
  text.replace(/^\s{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, '');

// Tags go; the text between them stays.
const stripHtmlTags = (text: string): string =>
  text.replace(new RegExp(`<\\/?[A-Za-z][^<>\\n]{0,${String(HTML_TAG_MAX)}}>`, 'g'), '');

const stripLinks = (text: string): string =>
  text.replace(
    new RegExp(
      `!?\\[([^\\]\\n]{0,${String(LINK_TEXT_MAX)}})\\]\\([^)\\n]{0,${String(LINK_TARGET_MAX)}}\\)`,
      'g',
    ),
    '$1',
  );

// Line markers must go before emphasis, so a leading "* " bullet is not read as italics.
const stripLineMarkers = (text: string): string =>
  text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '');

const stripEmphasis = (text: string): string =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/(^|\W)_(\S.*?)_(?=\W|$)/gu, '$1$2');

const toPlainText = (markdown: string): string =>
  stripEmphasis(
    stripLineMarkers(stripHtmlTags(stripLinks(stripThematicBreaks(stripFences(markdown))))),
  )
    .replace(/`+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// A cut in the middle of a surrogate pair leaves a lone high surrogate at the end; drop it.
const dropLoneHighSurrogate = (text: string): string => {
  const last = text.charCodeAt(text.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? text.slice(0, -1) : text;
};

// Grapheme clusters keep ZWJ emoji sequences and flags whole. Falls back to code points.
const splitGraphemes = (text: string): string[] => {
  if (typeof Intl.Segmenter !== 'function') {
    return Array.from(text);
  }
  const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text), (part) => part.segment);
};

// The ellipsis counts toward maxChars. Input beyond the read window counts as truncated.
export const createPreview = (markdown: string, maxChars = DEFAULT_PREVIEW_MAX_CHARS): string => {
  const limit = Math.max(0, Math.floor(maxChars));
  const readLength = limit * INPUT_UNITS_PER_CHAR;
  const inputTruncated = markdown.length > readLength;
  const head = inputTruncated ? dropLoneHighSurrogate(markdown.slice(0, readLength)) : markdown;
  const text = toPlainText(head);
  if (text === '') {
    return '';
  }
  const graphemes = splitGraphemes(text);
  if (!inputTruncated && graphemes.length <= limit) {
    return text;
  }
  if (limit === 0) {
    return '';
  }
  return `${graphemes
    .slice(0, limit - 1)
    .join('')
    .trimEnd()}${ELLIPSIS}`;
};
