import { describe, expect, it } from 'vitest';
import { createLocalStorageStore } from './localStorageStore';
import type { DocumentStore } from './DocumentStore';
import { createMemoryStorage, makeDoc, quotaError } from './testStorage';

const OK: { ok: true; value: undefined } = { ok: true, value: undefined };

const listedIds = async (store: DocumentStore): Promise<string[]> => {
  const result = await store.list();
  return result.ok ? result.value.map((summary) => summary.id) : [];
};

describe('createLocalStorageStore', () => {
  it('lists an empty store as an empty array (T6)', async () => {
    const store = createLocalStorageStore({ storage: createMemoryStorage() });

    expect(await store.list()).toEqual({ ok: true, value: [] });
  });

  it('round-trips a saved document through get and reports success (T6)', async () => {
    const store = createLocalStorageStore({ storage: createMemoryStorage() });
    const doc = makeDoc({ title: 'Plan' });

    expect(await store.save(doc)).toEqual({ ok: true, value: undefined });
    expect(await store.get('doc-1')).toEqual({ ok: true, value: doc });
  });

  it('uses the chiri. key prefix by default and accepts an override (T6)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    const custom = createLocalStorageStore({ storage, keyPrefix: 'test.' });

    await store.save(makeDoc());
    await custom.save(makeDoc({ id: 'doc-2' }));

    expect([...storage.data.keys()].sort()).toEqual([
      'chiri.doc.doc-1',
      'chiri.index',
      'test.doc.doc-2',
      'test.index',
    ]);
  });

  it('lists newest first and breaks ties by id (H4, T6)', async () => {
    const store = createLocalStorageStore({ storage: createMemoryStorage() });

    await store.save(makeDoc({ id: 'b', updatedAt: 5 }));
    await store.save(makeDoc({ id: 'a', updatedAt: 5 }));
    await store.save(makeDoc({ id: 'c', updatedAt: 9 }));

    expect(await listedIds(store)).toEqual(['c', 'a', 'b']);
  });

  it('returns summaries carrying the title, a preview and updatedAt (H4)', async () => {
    const store = createLocalStorageStore({ storage: createMemoryStorage() });

    await store.save(
      makeDoc({ title: 'Plan', markdown: '# Heading\n\nBody **text**', updatedAt: 7 }),
    );

    expect(await store.list()).toEqual({
      ok: true,
      value: [{ id: 'doc-1', title: 'Plan', preview: 'Heading Body text', updatedAt: 7 }],
    });
  });

  it('lists from the index without parsing documents (T6)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    await store.save(makeDoc({ id: 'a' }));
    await store.save(makeDoc({ id: 'b' }));
    storage.reads.length = 0;

    await store.list();

    expect(storage.reads.some((key) => key.startsWith('chiri.doc.'))).toBe(false);
  });

  it('keeps a document whose body was corrupted after indexing in list, and returns corrupt from get (T6)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    await store.save(makeDoc({ id: 'bad' }));
    storage.data.set('chiri.doc.bad', '{"id":"bad"');

    expect(await listedIds(store)).toEqual(['bad']);
    expect(await store.get('bad')).toEqual({ ok: false, error: { kind: 'corrupt' } });
  });

  it('returns corrupt when a stored document id does not match its key (T6)', async () => {
    const storage = createMemoryStorage();
    storage.data.set('chiri.doc.doc-1', JSON.stringify(makeDoc({ id: 'other' })));
    const store = createLocalStorageStore({ storage });

    expect(await store.get('doc-1')).toEqual({ ok: false, error: { kind: 'corrupt' } });
  });

  it('returns not-found from get for an unknown id (T6)', async () => {
    const store = createLocalStorageStore({ storage: createMemoryStorage() });

    expect(await store.get('missing')).toEqual({ ok: false, error: { kind: 'not-found' } });
  });

  it('returns quota when the document write exceeds its limit (T6)', async () => {
    const store = createLocalStorageStore({
      storage: createMemoryStorage(() => {
        throw quotaError();
      }),
    });

    expect(await store.save(makeDoc())).toEqual({ ok: false, error: { kind: 'quota' } });
  });

  it('rejects a document that fails validation and leaves storage untouched (T6, D7)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    const entry = { id: 'h', author: 'ai' as const, markdown: 'x', createdAt: 0 };
    const before = new Map(storage.data);

    const result = await store.save(makeDoc({ history: Array.from({ length: 201 }, () => entry) }));

    expect(result).toEqual({ ok: false, error: { kind: 'invalid' } });
    expect(storage.data).toEqual(before);
  });

  it('rethrows an unrelated storage error because it is a bug, not an expected result (T6)', async () => {
    const store = createLocalStorageStore({
      storage: createMemoryStorage(() => {
        throw new Error('disk on fire');
      }),
    });

    await expect(store.save(makeDoc())).rejects.toThrow('disk on fire');
  });

  it('removes a document and drops it from the list (H5, T6)', async () => {
    const storage = createMemoryStorage();
    const store = createLocalStorageStore({ storage });
    await store.save(makeDoc({ id: 'keep' }));
    await store.save(makeDoc({ id: 'drop' }));

    expect(await store.remove('drop')).toEqual(OK);
    expect(await listedIds(store)).toEqual(['keep']);
    expect(await store.get('drop')).toEqual({ ok: false, error: { kind: 'not-found' } });
  });

  it('returns not-found when removing an id absent from index and storage (H5)', async () => {
    const store = createLocalStorageStore({ storage: createMemoryStorage() });

    expect(await store.remove('missing')).toEqual({ ok: false, error: { kind: 'not-found' } });
  });

  it('keeps non-ASCII titles and emoji through save, list and get (T6, H4)', async () => {
    const store = createLocalStorageStore({ storage: createMemoryStorage() });
    const doc = makeDoc({ title: 'Café 👋 naïve', markdown: '日本語 😀 text' });

    await store.save(doc);

    expect(await store.get('doc-1')).toEqual({ ok: true, value: doc });
    const list = await store.list();
    expect(list.ok && list.value[0]?.title).toBe('Café 👋 naïve');
    expect(list.ok && list.value[0]?.preview).toBe('日本語 😀 text');
  });
});
