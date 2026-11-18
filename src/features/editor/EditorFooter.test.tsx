import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorFooter } from './EditorFooter';

const NOW = Date.UTC(2026, 10, 18, 12, 0, 0);

describe('EditorFooter', () => {
  it('shows the last save and the revision count', () => {
    render(<EditorFooter info={{ savedAt: NOW - 5 * 60_000, revisions: 3 }} now={NOW} />);
    expect(screen.getByText(/Last edited/)).toBeTruthy();
    expect(screen.getByText('3 revisions')).toBeTruthy();
  });

  it('uses the singular for one revision', () => {
    render(<EditorFooter info={{ savedAt: NOW, revisions: 1 }} now={NOW} />);
    expect(screen.getByText('1 revision')).toBeTruthy();
  });

  it('says so when a new document has not been saved', () => {
    render(<EditorFooter info={{ savedAt: null, revisions: 0 }} now={NOW} />);
    expect(screen.getByText('Not saved yet')).toBeTruthy();
    expect(screen.getByText('0 revisions')).toBeTruthy();
  });
});
