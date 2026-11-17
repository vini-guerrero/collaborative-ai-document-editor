import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findTabStop, navigationTarget, typeaheadTarget } from './listKeyboard';

// Builds a page as plain DOM. findTabStop reads the document, so each test renders its own.
function buildPage(markup: string): void {
  document.body.innerHTML = markup;
}

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing test element ${id}`);
  }
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('findTabStop (S9, D17)', () => {
  beforeEach(() => {
    buildPage(`
      <button id="first">First</button>
      <button id="trigger">Trigger</button>
      <div id="panel"><button id="inside">Inside panel</button></div>
      <button id="hidden" hidden>Hidden</button>
      <button id="last">Last</button>
    `);
  });

  it('returns the next control after the trigger, skipping the panel and hidden controls', () => {
    const panel = byId('panel');

    expect(findTabStop(byId('trigger'), panel, false)).toBe(byId('last'));
  });

  it('returns the previous control for Shift+Tab', () => {
    expect(findTabStop(byId('trigger'), byId('panel'), true)).toBe(byId('first'));
  });

  it('does not wrap Shift+Tab from the first control to the end of the page', () => {
    expect(findTabStop(byId('first'), null, true)).toBeNull();
  });

  it('does not wrap Tab from the last control to the start of the page', () => {
    expect(findTabStop(byId('last'), null, false)).toBeNull();
  });

  it('returns null for a trigger that is not a tab stop', () => {
    expect(findTabStop(byId('inside'), byId('panel'), false)).toBeNull();
  });
});

// Pure keyboard rules: they do not touch the DOM, so they are checked with plain values.
describe('list keyboard rules (S9)', () => {
  const ENTRIES = [
    { label: 'Friendly' },
    { label: 'Formal', disabled: true },
    { label: 'Neutral' },
  ] as const;

  it('wraps ArrowDown from the last enabled entry and skips disabled ones', () => {
    expect(navigationTarget(ENTRIES, 2, 'ArrowDown')).toBe(0);
  });

  it('matches type-ahead case-insensitively and never onto a disabled entry', () => {
    expect(typeaheadTarget(ENTRIES, 'fo', 0)).toBeUndefined();
    expect(typeaheadTarget(ENTRIES, 'NEU', 0)).toBe(2);
  });
});
