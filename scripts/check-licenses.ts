// S8: permissive-license allowlist, run by `pnpm check` (T13). Covers transitive dependencies
// through `pnpm licenses list --json`. Node 24 strips types, so only erasable TypeScript is used.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export interface LicensedPackage {
  readonly name: string;
  readonly versions: readonly string[];
  readonly license: string;
}

// Keys are license strings as pnpm reports them; values are the packages under that license.
export type LicenseReport = Readonly<Record<string, readonly LicensedPackage[]>>;

export interface LicenseException {
  readonly name: string;
  readonly license: string;
  readonly reason: string;
}

export type ViolationReason = 'banned' | 'license';

export interface Violation {
  readonly name: string;
  readonly version: string;
  readonly license: string;
  readonly reason: ViolationReason;
  readonly message: string;
}

export interface CheckOptions {
  readonly allowedLicenses: readonly string[];
  readonly exceptions: readonly LicenseException[];
  readonly bannedPackages: readonly string[];
}

// S8: exact strings only. Adding a license here is a deliberate human decision.
export const ALLOWED_LICENSES: readonly string[] = [
  'Apache-2.0',
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
];

// S8: a deliberate human decision to add an entry. An exception matches only when both the
// package name and the license string match. Each entry needs a reason.
export const LICENSE_EXCEPTIONS: readonly LicenseException[] = [
  {
    name: '@isaacs/nonrecursive-glob-match',
    license: 'BlueOak-1.0.0',
    reason: 'permissive license, dev tooling',
  },
  { name: 'minimatch', license: 'BlueOak-1.0.0', reason: 'permissive license, dev tooling' },
  {
    name: 'lru-cache',
    license: 'BlueOak-1.0.0',
    reason: 'permissive license, dev tooling (jsdom)',
  },
  {
    name: 'caniuse-lite',
    license: 'CC-BY-4.0',
    reason: 'browser data, dev tooling, attribution only',
  },
  {
    name: 'lightningcss',
    license: 'MPL-2.0',
    reason: 'weak file-level copyleft, unmodified dev build tool, not shipped',
  },
  {
    name: 'lightningcss-linux-arm64-gnu',
    license: 'MPL-2.0',
    reason: 'weak file-level copyleft, unmodified dev build tool, not shipped',
  },
];

// S6, S8: banned regardless of license.
export const BANNED_PACKAGES: readonly string[] = ['@atlaskit/icon', '@atlaskit/logo'];

export const DEFAULT_CHECK_OPTIONS: CheckOptions = {
  allowedLicenses: ALLOWED_LICENSES,
  exceptions: LICENSE_EXCEPTIONS,
  bannedPackages: BANNED_PACKAGES,
};

const PNPM_COMMAND = 'pnpm';
const PNPM_ARGS: readonly string[] = ['licenses', 'list', '--json'];
const PNPM_TIMEOUT_MS = 120_000;
const PNPM_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

const SPDX_OPERATORS: readonly string[] = ['AND', 'OR', 'WITH'];
const SPDX_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+-]*$/;

interface ParseResult {
  readonly value: boolean;
  readonly next: number;
}

function tokenize(expression: string): string[] {
  return expression
    .replace(/\(/g, ' ( ')
    .replace(/\)/g, ' ) ')
    .trim()
    .split(/\s+/)
    .filter((token) => token !== '');
}

// SPDX precedence: AND binds tighter than OR. Returns undefined when the expression is malformed.
function parseAtom(
  tokens: readonly string[],
  pos: number,
  allowed: readonly string[],
): ParseResult | undefined {
  const token = tokens[pos];
  if (token === undefined) {
    return undefined;
  }
  if (token === '(') {
    const inner = parseOr(tokens, pos + 1, allowed);
    if (inner === undefined || tokens[inner.next] !== ')') {
      return undefined;
    }
    return { value: inner.value, next: inner.next + 1 };
  }
  if (token === ')' || SPDX_OPERATORS.includes(token) || !SPDX_IDENTIFIER_PATTERN.test(token)) {
    return undefined;
  }
  return { value: allowed.includes(token), next: pos + 1 };
}

function parseAnd(
  tokens: readonly string[],
  pos: number,
  allowed: readonly string[],
): ParseResult | undefined {
  const first = parseAtom(tokens, pos, allowed);
  if (first === undefined) {
    return undefined;
  }
  let value = first.value;
  let next = first.next;
  while (tokens[next] === 'AND') {
    const right = parseAtom(tokens, next + 1, allowed);
    if (right === undefined) {
      return undefined;
    }
    value = value && right.value;
    next = right.next;
  }
  return { value, next };
}

function parseOr(
  tokens: readonly string[],
  pos: number,
  allowed: readonly string[],
): ParseResult | undefined {
  const first = parseAnd(tokens, pos, allowed);
  if (first === undefined) {
    return undefined;
  }
  let value = first.value;
  let next = first.next;
  while (tokens[next] === 'OR') {
    const right = parseAnd(tokens, next + 1, allowed);
    if (right === undefined) {
      return undefined;
    }
    value = value || right.value;
    next = right.next;
  }
  return { value, next };
}

// Unparseable expressions are not allowed, so they become violations.
export function isLicenseAllowed(expression: string, allowedLicenses: readonly string[]): boolean {
  const tokens = tokenize(expression);
  const parsed = parseOr(tokens, 0, allowedLicenses);
  return parsed?.next === tokens.length && parsed.value;
}

function isExcepted(
  name: string,
  license: string,
  exceptions: readonly LicenseException[],
): boolean {
  return exceptions.some((exception) => exception.name === name && exception.license === license);
}

function violationReason(
  name: string,
  license: string,
  options: CheckOptions,
): ViolationReason | undefined {
  if (options.bannedPackages.includes(name)) {
    return 'banned';
  }
  if (isExcepted(name, license, options.exceptions)) {
    return undefined;
  }
  if (isLicenseAllowed(license, options.allowedLicenses)) {
    return undefined;
  }
  return 'license';
}

export function findViolations(
  report: LicenseReport,
  options: CheckOptions = DEFAULT_CHECK_OPTIONS,
): Violation[] {
  const violations: Violation[] = [];
  for (const [license, packages] of Object.entries(report)) {
    for (const pkg of packages) {
      for (const version of pkg.versions) {
        const reason = violationReason(pkg.name, license, options);
        if (reason !== undefined) {
          violations.push({
            name: pkg.name,
            version,
            license,
            reason,
            message: `${pkg.name}@${version}: ${license}`,
          });
        }
      }
    }
  }
  return violations;
}

function countPackageVersions(report: LicenseReport): number {
  return Object.values(report).reduce(
    (total, packages) => total + packages.reduce((sum, pkg) => sum + pkg.versions.length, 0),
    0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLicensedPackage(value: unknown): value is LicensedPackage {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.license === 'string' &&
    Array.isArray(value.versions) &&
    value.versions.every((version) => typeof version === 'string')
  );
}

function isLicenseReport(value: unknown): value is LicenseReport {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (packages) => Array.isArray(packages) && packages.every(isLicensedPackage),
    )
  );
}

// Parses untrusted command output. Returns undefined instead of throwing on bad input.
function parseReport(raw: string): LicenseReport | undefined {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  return isLicenseReport(value) ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

function runLicenseList(): string | undefined {
  try {
    return execFileSync(PNPM_COMMAND, PNPM_ARGS, {
      encoding: 'utf8',
      maxBuffer: PNPM_MAX_BUFFER_BYTES,
      timeout: PNPM_TIMEOUT_MS,
    });
  } catch (error: unknown) {
    const detail = errorMessage(error);
    process.stderr.write(`License check: could not run pnpm licenses list: ${detail}\n`);
    return undefined;
  }
}

function main(): void {
  const raw = runLicenseList();
  if (raw === undefined) {
    process.exitCode = 1;
    return;
  }

  const report = parseReport(raw);
  if (report === undefined) {
    process.stderr.write('License check: pnpm licenses list returned unexpected output.\n');
    process.exitCode = 1;
    return;
  }

  const violations = findViolations(report);
  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(`${violation.message}\n`);
    }
    process.stderr.write(`License check failed: ${String(violations.length)} violation(s).\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `License check passed: ${String(countPackageVersions(report))} package versions.\n`,
  );
}

const isDirectRun =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main();
}
