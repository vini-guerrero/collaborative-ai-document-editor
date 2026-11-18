import { describe, expect, it } from 'vitest';
import { SLASH_ITEMS, filterSlashItems, slashOptionDomId } from './slashItems';

// D12: four actions, filtered by the text typed after the slash.
describe('slashItems', () => {
  it('offers the four D12 actions', () => {
    expect(SLASH_ITEMS.map((item) => item.label)).toEqual([
      'Rewrite paragraph',
      'Change tone',
      "Ask what's missing",
      'Restructure section',
    ]);
  });

  it('keeps every item for an empty query', () => {
    expect(filterSlashItems(SLASH_ITEMS, '')).toHaveLength(4);
    expect(filterSlashItems(SLASH_ITEMS, '   ')).toHaveLength(4);
  });

  it('matches case-insensitively on the label', () => {
    expect(filterSlashItems(SLASH_ITEMS, 'TONE').map((item) => item.id)).toEqual(['change-tone']);
  });

  it('returns nothing when no label matches', () => {
    expect(filterSlashItems(SLASH_ITEMS, 'zzz')).toEqual([]);
  });

  it('builds a DOM id from the item id', () => {
    expect(slashOptionDomId('ask-missing')).toBe('slash-option-ask-missing');
  });
});
