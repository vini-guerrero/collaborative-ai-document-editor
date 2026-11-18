import { getSchema } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';
import { createEditorExtensions } from '../markdown/extensions';
import { isActionPossible, requestSectionsOf } from './requestSections';
import { outline } from './sections';

// D10: each section sends its heading and its body without the heading line.
describe('requestSectionsOf', () => {
  it('sends the heading text and the body after the heading line', () => {
    const result = requestSectionsOf(outline('Opening\n\n# A\n\nfirst\n'));
    expect(result).toEqual({
      ok: true,
      sections: [
        { heading: '', body: 'Opening\n\n' },
        { heading: 'A', body: '\nfirst\n' },
      ],
    });
  });

  // D10, T5: an empty document has nothing to restructure.
  it('reports an empty document', () => {
    expect(requestSectionsOf([])).toEqual({ ok: false, reason: 'empty' });
  });
});

const schema = getSchema(createEditorExtensions());
const para = (text: string): Node => schema.node('paragraph', null, [schema.text(text)]);
const heading = (text: string): Node => schema.node('heading', { level: 2 }, [schema.text(text)]);

// D10, D14: an action with no valid operation is not sent, so it cannot show as an AI outage.
describe('isActionPossible', () => {
  it('rejects move and merge with a single section', () => {
    const doc = schema.node('doc', null, [para('Only one paragraph.')]);
    expect(isActionPossible(doc, 'move', 0)).toBe(false);
    expect(isActionPossible(doc, 'merge', 0)).toBe(false);
  });

  it('allows move and merge with two sections', () => {
    const doc = schema.node('doc', null, [heading('A'), para('a'), heading('B'), para('b')]);
    expect(isActionPossible(doc, 'move', 0)).toBe(true);
    expect(isActionPossible(doc, 'merge', 1)).toBe(true);
  });

  it('allows split only when the section has two paragraphs', () => {
    const doc = schema.node('doc', null, [
      heading('A'),
      para('a'),
      heading('B'),
      para('b'),
      para('c'),
    ]);
    expect(isActionPossible(doc, 'split', 0)).toBe(false);
    expect(isActionPossible(doc, 'split', 1)).toBe(true);
  });
});
