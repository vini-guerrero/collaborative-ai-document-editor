import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  it('sets the tab title with the product name and restores the old one', () => {
    document.title = 'Before';
    const { rerender, unmount } = renderHook(
      ({ name }) => {
        useDocumentTitle(name);
      },
      { initialProps: { name: 'Notes' } },
    );
    expect(document.title).toBe('Notes - WebApp');

    rerender({ name: '  ' });
    expect(document.title).toBe('WebApp');

    unmount();
    expect(document.title).toBe('Before');
  });
});
