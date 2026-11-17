import { Editor, type JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { createEditorExtensions } from './extensions';
import { parseMarkdown, serializeMarkdown } from './markdown';

// T2, D13: a Markdown string goes in, the same canonical Markdown comes out after one trip
// through the headless editor. Trailing newlines are ignored; the content must match exactly.
function roundTrip(source: string): string {
  const parsed = parseMarkdown(source);
  if (!parsed.ok) {
    throw new Error(`parse failed: ${parsed.error.reason}`);
  }
  const editor = new Editor({ extensions: createEditorExtensions(), content: parsed.value });
  try {
    return serializeMarkdown(editor).trim();
  } finally {
    editor.destroy();
  }
}

// Renders parsed content in a headless editor and returns a detached copy of its DOM, for the
// raw HTML safety checks. The copy is taken before destroy(), which tears the view down.
function renderedDom(source: string): HTMLElement {
  const parsed = parseMarkdown(source);
  if (!parsed.ok) {
    throw new Error(`parse failed: ${parsed.error.reason}`);
  }
  const editor = new Editor({ extensions: createEditorExtensions(), content: parsed.value });
  try {
    const copy = editor.view.dom.cloneNode(true);
    if (!(copy instanceof HTMLElement)) {
      throw new Error('editor rendered no element');
    }
    return copy;
  } finally {
    editor.destroy();
  }
}

describe('parseMarkdown', () => {
  it('returns a heading node for an ATX heading', () => {
    const parsed = parseMarkdown('# Title');

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.content?.[0]?.type).toBe('heading');
    }
  });

  it('accepts a blank document', () => {
    const parsed = parseMarkdown('');

    expect(parsed.ok).toBe(true);
  });
});

describe('Markdown round trip (T2)', () => {
  it('keeps headings', () => {
    const source = '# Heading one\n\n## Heading two';

    expect(roundTrip(source)).toBe(source);
  });

  it('keeps bullet and ordered lists', () => {
    expect(roundTrip('- first\n- second')).toBe('- first\n- second');
    expect(roundTrip('1. first\n2. second')).toBe('1. first\n2. second');
  });

  it('keeps bold and italic', () => {
    expect(roundTrip('This is **bold** and *italic* text.')).toBe(
      'This is **bold** and *italic* text.',
    );
  });

  it('keeps inline code', () => {
    expect(roundTrip('Use `const x = 1` here.')).toBe('Use `const x = 1` here.');
  });

  it('keeps fenced code blocks', () => {
    const source = '```ts\nconst answer = 42;\n```';

    expect(roundTrip(source)).toBe(source);
  });

  it('keeps links', () => {
    expect(roundTrip('See [the docs](https://example.com/docs) now.')).toBe(
      'See [the docs](https://example.com/docs) now.',
    );
  });

  it('keeps blank documents blank', () => {
    expect(roundTrip('')).toBe('');
  });

  it('keeps non-ASCII text and emoji', () => {
    const source = '# Café 🚀\n\nNaïve text: 日本語 and emoji 👍.';

    expect(roundTrip(source)).toBe(source);
  });
});

describe('raw HTML in Markdown never becomes live DOM (T10)', () => {
  it('drops a script block', () => {
    const dom = renderedDom('<script>alert(1)</script>\n\nafter');

    expect(dom.querySelector('script')).toBeNull();
    expect(dom.textContent).toContain('after');
  });

  it('drops an img with an onerror handler', () => {
    const dom = renderedDom('Before <img src=x onerror="alert(2)"> after');

    expect(dom.querySelector('img')).toBeNull();
    expect(dom.querySelector('[onerror]')).toBeNull();
  });

  it('drops an inline script tag', () => {
    const dom = renderedDom('Text <script>alert(3)</script> more');

    expect(dom.querySelector('script')).toBeNull();
  });

  it('does not keep a javascript: link target', () => {
    const dom = renderedDom('[click](javascript:alert(4))');

    expect(dom.querySelector('a[href^="javascript"]')).toBeNull();
  });
});

// A document holding one paragraph with plain text (no Markdown parsing involved).
function paragraphDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

function serializeDoc(doc: JSONContent): string {
  const editor = new Editor({ extensions: createEditorExtensions(), content: doc });
  try {
    return serializeMarkdown(editor).trim();
  } finally {
    editor.destroy();
  }
}

// D13, T2: plain paragraph text survives save and reload as the same paragraph.
function expectParagraphRoundTrip(text: string): void {
  const doc = paragraphDoc(text);
  const parsed = parseMarkdown(serializeDoc(doc));
  if (!parsed.ok) {
    throw new Error(`parse failed: ${parsed.error.reason}`);
  }
  expect(parsed.value).toEqual(doc);
}

describe('plain paragraph text that looks like block syntax (T2)', () => {
  it('escapes a leading bullet marker so it stays a paragraph', () => {
    expect(serializeDoc(paragraphDoc('- one'))).toBe('\\- one');
    expectParagraphRoundTrip('- one');
    expectParagraphRoundTrip('+ one');
  });

  it('escapes a leading ordered marker', () => {
    expect(serializeDoc(paragraphDoc('1. one'))).toBe('1\\. one');
    expectParagraphRoundTrip('1. one');
    expectParagraphRoundTrip('2) one');
  });

  it('escapes a leading heading marker', () => {
    expect(serializeDoc(paragraphDoc('# title'))).toBe('\\# title');
    expectParagraphRoundTrip('# title');
  });

  it('keeps a leading quote marker literal through the encoded form', () => {
    // The manager encodes ">" as an entity, so the marker never starts a line in the output.
    expect(serializeDoc(paragraphDoc('> quote'))).toBe('&gt; quote');
    expectParagraphRoundTrip('> quote');
  });

  it('escapes a leading thematic break', () => {
    expectParagraphRoundTrip('---');
  });

  it('leaves a dash inside the text unchanged', () => {
    expect(serializeDoc(paragraphDoc('a - b'))).toBe('a - b');
    expectParagraphRoundTrip('a - b');
  });

  it('round-trips non-ASCII text', () => {
    expectParagraphRoundTrip('café — 日本語 - ok');
  });

  it('reaches a stable serialized form for an empty paragraph', () => {
    const first = serializeDoc({ type: 'doc', content: [{ type: 'paragraph' }] });
    const parsed = parseMarkdown(first);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(serializeDoc(parsed.value)).toBe(first);
    }
  });

  it('still serializes real lists and headings as blocks', () => {
    const list = parseMarkdown('- one');
    const heading = parseMarkdown('# title');

    expect(list.ok && list.value.content?.[0]?.type).toBe('bulletList');
    expect(heading.ok && heading.value.content?.[0]?.type).toBe('heading');
    expect(roundTrip('- one')).toBe('- one');
  });
});
