import { describe, expect, it } from 'vitest';
import { createLocalStorageStore } from './localStorageStore';
import { createMemoryStorage, makeDoc, quotaError } from './testStorage';
import type { DocumentStore } from './DocumentStore';

const OK: { ok: true; value: undefined } = { ok: true, value: undefined };

const listedIds = async (store: DocumentStore): Promise<string[]> => {
  const result = await store.list();
  return result.ok ? result.value.map((summary) => summary.id) : [];
};

describe('createLocalStorageStore recovery (T6, data safety)', () => {
  it('keeps every document when the index is corrupt and a new one is saved (T6)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    await store.save(makeDoc({ id: 'a', updatedAt: 1 }));
    await store.save(makeDoc({ id: 'b', updatedAt: 2 }));
    storage.data.set('chiri.index', '{garbage');

    expect(await store.save(makeDoc({ id: 'c', updatedAt: 3 }))).toEqual(OK);
    expect(await listedIds(store)).toEqual(['c', 'b', 'a']);
  });

  it('recovers listed documents from keys when the index is missing (T6)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    await store.save(makeDoc({ id: 'doc-1', updatedAt: 4 }));
    storage.data.delete('chiri.index');

    expect(await listedIds(store)).toEqual(['doc-1']);
    expect(storage.data.has('chiri.index')).toBe(true);
  });

  it('skips corrupt documents while rebuilding a missing index (T6)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    await store.save(makeDoc({ id: 'good' }));
    storage.data.set('chiri.doc.bad', '{"id":"bad"');

    expect(await listedIds(store)).toEqual(['good']);
  });

  it('removes the new document when only the index write fails (T6, data safety)', async () => {
    const storage = createMemoryStorage((key) => {
      if (key === 'chiri.index') {
        throw quotaError();
      }
    });
    const store = createLocalStorageStore({ storage });

    expect(await store.save(makeDoc({ id: 'doc-1' }))).toEqual({
      ok: false,
      error: { kind: 'quota' },
    });
    expect(storage.data.has('chiri.doc.doc-1')).toBe(false);
  });

  it('leaves a stored document unchanged when a rejected save targets its id (T6, D7)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    await store.save(makeDoc({ id: 'doc-1', title: 'Old' }));
    const entry = { id: 'h', author: 'ai' as const, markdown: 'x', createdAt: 0 };

    const result = await store.save(
      makeDoc({ id: 'doc-1', title: 'New', history: Array.from({ length: 201 }, () => entry) }),
    );

    expect(result).toEqual({ ok: false, error: { kind: 'invalid' } });
    const stored = await store.get('doc-1');
    expect(stored.ok && stored.value.title).toBe('Old');
  });

  it('keeps the document stored and returns the error when the remove index write fails (H5, data safety)', async () => {
    let failIndex = false;
    const storage = createMemoryStorage((key) => {
      if (failIndex && key === 'chiri.index') {
        throw quotaError();
      }
    });
    const store = createLocalStorageStore({ storage });
    await store.save(makeDoc({ id: 'doc-1' }));
    failIndex = true;

    expect(await store.remove('doc-1')).toEqual({ ok: false, error: { kind: 'quota' } });
    expect((await store.get('doc-1')).ok).toBe(true);
  });

  it('skips the index write when a re-save leaves the summary unchanged (T6)', async () => {
    let indexWrites = 0;
    const store = createLocalStorageStore({
      storage: createMemoryStorage((key) => {
        if (key === 'chiri.index') {
          indexWrites += 1;
        }
      }),
    });
    const doc = makeDoc({ id: 'doc-1', updatedAt: 9 });

    await store.save(doc);
    await store.save(doc);

    expect(indexWrites).toBe(1);
  });
});
