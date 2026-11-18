import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installMatchMedia, resetMatchMedia } from './matchMedia';

installMatchMedia();

// Unmount rendered trees and clear the DOM after every test so tests stay isolated.
afterEach(() => {
  cleanup();
  resetMatchMedia();
});

// DEBT: jsdom 31 implements HTMLDialogElement but not showModal() or close(). This stub installs
// only when they are missing and covers what Dialog relies on: the open attribute, focusing the
// first enabled control on open, restoring focus to the previously focused element on close, and
// a synchronous close event. It does NOT emulate: the Escape key (tests dispatch "cancel"
// directly), a focus trap or Tab cycling, inert background content, CloseWatcher, or the
// asynchronous close event browsers fire after close(). Dialog's close-event guard is therefore
// only exercised synchronously here. Remove this block once jsdom ships the methods.
const dialogFocusReturn = new WeakMap<HTMLDialogElement, Element | null>();

if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement): void {
    if (this.hasAttribute('open')) {
      return;
    }
    dialogFocusReturn.set(this, document.activeElement);
    this.setAttribute('open', '');
    this.querySelector<HTMLElement>(
      'button:not(:disabled):not([aria-disabled="true"]), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)',
    )?.focus();
  };

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement): void {
    if (!this.hasAttribute('open')) {
      return;
    }
    this.removeAttribute('open');
    const previous = dialogFocusReturn.get(this);
    dialogFocusReturn.delete(this);
    if (previous instanceof HTMLElement) {
      previous.focus();
    }
    this.dispatchEvent(new Event('close'));
  };
}

// DEBT: jsdom has no layout. ProseMirror's scroll and hit-test paths call these, so they get
// inert stand-ins that report an empty box. Tests therefore cannot assert positions or scrolling;
// revisit if a test ever needs real geometry (use a browser-mode test instead).
const EMPTY_RECT = new DOMRect(0, 0, 0, 0);
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = (): Element | null => null;
}
if (typeof Range.prototype.getClientRects !== 'function') {
  Range.prototype.getClientRects = (): DOMRectList =>
    Object.assign([], { item: (): DOMRect | null => null });
}
if (typeof Range.prototype.getBoundingClientRect !== 'function') {
  Range.prototype.getBoundingClientRect = (): DOMRect => EMPTY_RECT;
}
