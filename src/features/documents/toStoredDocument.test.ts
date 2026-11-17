import { describe, expect, it } from 'vitest';
import type { StoredDocument } from './schema';
import { toStoredDocument } from './toStoredDocument';

const DRAFT = { id: 'doc-1', title: 'Title', markdown: 'Body' };

const STORED: StoredDocument = {
  id: 'doc-1',
  title: 'Old title',
  markdown: 'Old body',
  createdAt: 100,
  updatedAt: 200,
  history: [{ id: 'h-1', author: 'user', markdown: 'Earlier', createdAt: 150 }],
  schemaVersion: 1,
};

describe('toStoredDocument', () => {
  // H5: a new document starts at the save time with no history.
  it('builds a new document with createdAt and updatedAt set to now (H5)', () => {
    const doc = toStoredDocument(null, DRAFT, 500);

    expect(doc).toEqual({
      id: 'doc-1',
      title: 'Title',
      markdown: 'Body',
      createdAt: 500,
      updatedAt: 500,
      history: [],
      schemaVersion: 1,
    });
  });

  // D17: an existing document keeps its creation time and history; only updatedAt moves.
  it('keeps createdAt and history of the stored copy and moves updatedAt (D17)', () => {
    const doc = toStoredDocument(STORED, DRAFT, 500);

    expect(doc.createdAt).toBe(100);
    expect(doc.history).toEqual(STORED.history);
    expect(doc.updatedAt).toBe(500);
    expect(doc.title).toBe('Title');
    expect(doc.markdown).toBe('Body');
  });
});
