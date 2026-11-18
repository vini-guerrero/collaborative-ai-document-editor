export interface LruCache<V> {
  get: (key: string) => V | undefined;
  set: (key: string, value: V) => void;
  // Does not count as a use: only `get` and `set` refresh recency.
  has: (key: string) => boolean;
  delete: (key: string) => void;
  readonly size: number;
}

interface Entry<V> {
  readonly value: V;
}

// Map keeps insertion order, so the first key is always the least recently used one.
// A bounded cache keeps memory flat however long the editor session runs (bound everything).
export const createLruCache = <V>(capacity: number): LruCache<V> => {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError('LRU cache capacity must be a positive integer');
  }
  const entries = new Map<string, Entry<V>>();

  const get = (key: string): V | undefined => {
    const entry = entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    // Re-inserting moves the key to the most recently used end.
    entries.delete(key);
    entries.set(key, entry);
    return entry.value;
  };

  const set = (key: string, value: V): void => {
    entries.delete(key);
    entries.set(key, { value });
    if (entries.size <= capacity) {
      return;
    }
    const oldest = entries.keys().next();
    if (!oldest.done) {
      entries.delete(oldest.value);
    }
  };

  return {
    get,
    set,
    has: (key) => entries.has(key),
    delete: (key) => {
      entries.delete(key);
    },
    get size() {
      return entries.size;
    },
  };
};
