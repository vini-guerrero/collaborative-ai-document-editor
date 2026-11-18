import { describe, expect, it } from 'vitest';
import { modelLines } from './useModelNames';

describe('modelLines', () => {
  it('shows one line when every task uses the same model', () => {
    expect(modelLines({ analyze: 'a/m', rewrite: 'a/m', restructure: 'a/m' })).toBe('Model: a/m');
  });

  it('shows one line per task when the models differ', () => {
    expect(modelLines({ analyze: 'a/1', rewrite: 'a/2', restructure: 'a/1' })).toBe(
      'Analyze: a/1\nRewrite: a/2\nRestructure: a/1',
    );
  });
});
