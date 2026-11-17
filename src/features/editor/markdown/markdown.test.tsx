import { Editor } from '@tiptap/core';
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
