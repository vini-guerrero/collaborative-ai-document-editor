import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount rendered trees and clear the DOM after every test so tests stay isolated.
afterEach(() => {
  cleanup();
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
