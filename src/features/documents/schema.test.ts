import { describe, expect, it } from 'vitest';
import { DocumentSchema, IndexSchema, type StoredDocument } from './schema';

const validDoc: StoredDocument = {
  id: 'doc-1',
  title: 'Notes',
  markdown: 'Hello',
  createdAt: 1,
  updatedAt: 2,
  history: [],
  schemaVersion: 1,
};

describe('DocumentSchema', () => {
  it('accepts a valid document (T6, T11)', () => {
    expect(DocumentSchema.safeParse(validDoc).success).toBe(true);
  });

  it('rejects a wrong schemaVersion (T6)', () => {
    expect(DocumentSchema.safeParse({ ...validDoc, schemaVersion: 2 }).success).toBe(false);
  });

  it('accepts exactly 200 history entries and rejects 201 (D7)', () => {
    const entry = { id: 'h', author: 'ai' as const, markdown: 'x', createdAt: 0 };
    const atLimit = Array.from({ length: 200 }, () => entry);
    const overLimit = Array.from({ length: 201 }, () => entry);

    expect(DocumentSchema.safeParse({ ...validDoc, history: atLimit }).success).toBe(true);
    expect(DocumentSchema.safeParse({ ...validDoc, history: overLimit }).success).toBe(false);
  });

  it('rejects a history author outside user and ai (D7)', () => {
    const entry = { id: 'h', author: 'bot', markdown: 'x', createdAt: 0 };

    expect(DocumentSchema.safeParse({ ...validDoc, history: [entry] }).success).toBe(false);
  });

  it('rejects a non-integer or negative timestamp (T6)', () => {
    expect(DocumentSchema.safeParse({ ...validDoc, updatedAt: 1.5 }).success).toBe(false);
    expect(DocumentSchema.safeParse({ ...validDoc, createdAt: -1 }).success).toBe(false);
  });
});

describe('IndexSchema', () => {
  it('accepts summaries and rejects a wrong schemaVersion (T6)', () => {
    const summary = { id: 'a', title: 'A', preview: 'x', updatedAt: 1 };

    expect(IndexSchema.safeParse({ schemaVersion: 1, summaries: [summary] }).success).toBe(true);
    expect(IndexSchema.safeParse({ schemaVersion: 3, summaries: [] }).success).toBe(false);
  });

  it('rejects an index entry that is a bare id (T6)', () => {
    expect(IndexSchema.safeParse({ schemaVersion: 1, ids: ['a'] }).success).toBe(false);
  });
});
