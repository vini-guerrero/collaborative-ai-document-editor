import { describe, expect, it } from 'vitest';

import { findViolations, type LicenseReport } from './check-licenses.ts';

function reportOf(license: string, name: string, version = '1.0.0'): LicenseReport {
  return { [license]: [{ name, versions: [version], license }] };
}

describe('license allowlist (S8)', () => {
  it('S8: passes a package under an allowed license (MIT)', () => {
    expect(findViolations(reportOf('MIT', 'left-pad'))).toEqual([]);
  });

  it('S8: passes an OR expression when one option is allowed', () => {
    expect(findViolations(reportOf('(MIT OR GPL-3.0)', 'dual-pkg'))).toEqual([]);
  });

  it('S8: fails a copyleft license (GPL-3.0)', () => {
    const violations = findViolations(reportOf('GPL-3.0', 'left-pad'));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.reason).toBe('license');
  });

  it('S8: fails an AND expression when one part is not allowed', () => {
    expect(findViolations(reportOf('(MIT AND GPL-3.0)', 'and-pkg'))).toHaveLength(1);
  });

  it('S8: fails an unparseable license expression', () => {
    expect(findViolations(reportOf('MIT AND', 'broken-pkg'))).toHaveLength(1);
  });

  it('S8: an exception passes only for the exact package and license', () => {
    expect(findViolations(reportOf('BlueOak-1.0.0', 'minimatch', '9.0.5'))).toEqual([]);
    expect(findViolations(reportOf('BlueOak-1.0.0', 'other-pkg'))).toHaveLength(1);
  });

  it('S8: banned @atlaskit/icon fails even when MIT', () => {
    const violations = findViolations(reportOf('MIT', '@atlaskit/icon'));
    expect(violations).toHaveLength(1);
    expect(violations[0]?.reason).toBe('banned');
  });

  it('S8: the violation message includes name@version and license', () => {
    const [violation] = findViolations(reportOf('GPL-3.0', 'left-pad', '2.3.4'));
    expect(violation?.message).toContain('left-pad@2.3.4');
    expect(violation?.message).toContain('GPL-3.0');
  });
});
