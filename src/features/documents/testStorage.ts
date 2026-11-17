import type { StoredDocument } from './schema';

// Test-only fakes. Not a test file itself, so Vitest does not collect it.
export interface MemoryStorage extends Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'
> {
  readonly data: Map<string, string>;
  readonly reads: string[];
}

// beforeSetItem can throw to simulate a failing write for one key.
export const createMemoryStorage = (
  beforeSetItem: (key: string) => void = () => undefined,
): MemoryStorage => {
  const data = new Map<string, string>();
  const reads: string[] = [];
  return {
    data,
    reads,
    get length(): number {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => {
      reads.push(key);
      return data.get(key) ?? null;
    },
    setItem: (key, value) => {
      beforeSetItem(key);
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
};

export const quotaError = (): Error =>
  Object.assign(new Error('storage full'), { name: 'QuotaExceededError' });

export const makeDoc = (overrides: Partial<StoredDocument> = {}): StoredDocument => ({
  id: 'doc-1',
  title: 'Untitled',
  markdown: 'Hello',
  createdAt: 1,
  updatedAt: 1,
  history: [],
  schemaVersion: 1,
  ...overrides,
});
