import { describe, expect, it } from 'vitest';
import { requestSectionsOf } from './requestSections';
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
