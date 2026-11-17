import { describe, expect, it } from 'vitest';
import { MAX_SECTIONS } from './text';
import {
  RestructureOperationSchema,
  RestructureRequestSchema,
  RestructureResponseSchema,
} from './restructure';

const sections = [
  { heading: 'Intro', body: 'Hello.' },
  { heading: 'Details', body: 'More.' },
];

describe('RestructureRequestSchema (D10, D12)', () => {
  it('accepts move, split and merge', () => {
    for (const action of ['move', 'split', 'merge']) {
      expect(
        RestructureRequestSchema.safeParse({ task: 'restructure', action, section: 1, sections })
          .success,
      ).toBe(true);
    }
  });

  it('rejects an action outside D10', () => {
    const input = { task: 'restructure', action: 'delete', section: 0, sections };
    expect(RestructureRequestSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a section index outside sections', () => {
    const input = { task: 'restructure', action: 'move', section: 2, sections };
    expect(RestructureRequestSchema.safeParse(input).success).toBe(false);
  });

  it('rejects more than MAX_SECTIONS sections', () => {
    const many = Array.from({ length: MAX_SECTIONS + 1 }, () => ({ heading: 'h', body: 'b' }));
    const input = { task: 'restructure', action: 'move', section: 0, sections: many };
    expect(RestructureRequestSchema.safeParse(input).success).toBe(false);
  });

  it('rejects unknown fields on a section', () => {
    const input = {
      task: 'restructure',
      action: 'move',
      section: 0,
      sections: [{ heading: 'a', body: 'b', level: 2 }],
    };
    expect(RestructureRequestSchema.safeParse(input).success).toBe(false);
  });
});

describe('RestructureResponseSchema (T5)', () => {
  it('accepts each operation', () => {
    const operations = [
      { op: 'move', from: 2, to: 0 },
      { op: 'split', section: 1, atParagraph: 3 },
      { op: 'merge', first: 0, second: 1 },
    ];
    for (const operation of operations) {
      expect(RestructureResponseSchema.safeParse(operation).success).toBe(true);
    }
  });

  it('rejects a negative or fractional index', () => {
    expect(RestructureOperationSchema.safeParse({ op: 'move', from: -1, to: 0 }).success).toBe(
      false,
    );
    const fractional = { op: 'merge', first: 0.5, second: 1 };
    expect(RestructureOperationSchema.safeParse(fractional).success).toBe(false);
  });

  it('rejects free text and unknown fields', () => {
    expect(RestructureResponseSchema.safeParse({ text: 'Move it up.' }).success).toBe(false);
    const input: unknown = { op: 'move', from: 0, to: 1, reason: 'better' };
    expect(RestructureResponseSchema.safeParse(input).success).toBe(false);
  });
});
