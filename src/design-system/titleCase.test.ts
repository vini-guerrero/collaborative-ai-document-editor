import { describe, expect, it } from 'vitest';
import { titleCase } from './titleCase';

describe('titleCase', () => {
  it('capitalizes words and keeps minor words lowercase after the first', () => {
    expect(titleCase('More actions')).toBe('More Actions');
    expect(titleCase('Switch to light theme')).toBe('Switch to Light Theme');
    expect(titleCase('go to home')).toBe('Go to Home');
  });

  it('leaves apostrophes and accents inside words alone', () => {
    expect(titleCase("don't crème")).toBe("Don't Crème");
  });
});
