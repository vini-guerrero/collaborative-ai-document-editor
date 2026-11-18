import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import './Popover.css';

// The twelve floating-ui placements, spelled out so callers do not depend on @floating-ui/core.
export type PopoverPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export type PopoverRole = 'dialog' | 'presentation';

export interface PopoverProps {
  // The element the popover is attached to. While null, nothing renders.
  anchor: HTMLElement | null;
  open: boolean;
  // Called on Esc and on a press outside both the panel and the anchor.
  onClose: () => void;
  // Accessible name, for example "Suggestion for this sentence".
  label: string;
  // 'dialog' (default) names the panel with `label`. 'presentation' is for a panel whose child
  // already carries the role and name (a menu or listbox), so the wrapper adds no extra role.
  role?: PopoverRole;
  placement?: PopoverPlacement;
  // Where focus goes on close, as Dialog's onCloseFocus. Returning null, or an element that is
  // no longer in the document, falls back to the anchor, then to the document.
  returnFocusTo?: (() => HTMLElement | null) | undefined;
  children: ReactNode;
}

// A popover opened from inside another one (a Select in a card) registers its panel here, so a
// press or Esc in the child does not dismiss the parent.
const NestedPanels = createContext<Set<HTMLElement> | null>(null);

// S5, S9: 8px is --ds-space-100. CSS custom properties cannot be read during positioning, so the
// value is repeated here. Keep it in sync with tokens.css.
const POPOVER_OFFSET_PX = 8;
// S9: 16px is --ds-space-200, the gutter kept between the popover and the viewport edge.
const VIEWPORT_PADDING_PX = 16;

// Elements that take keyboard focus. Disabled, hidden and inert ones are filtered out below.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
]
  .map((target) => `${target}:not(:disabled):not([tabindex="-1"])`)
  .join(', ');

const UNAVAILABLE_SELECTOR = '[hidden], [inert], [aria-disabled="true"]';

function getFocusable(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.closest(UNAVAILABLE_SELECTOR) === null,
  );
}

// Focus lands on the first control in the panel, so Enter or Tab works at once. A panel with no
// controls takes focus itself so Esc still reaches it.
function focusFirstInside(panel: HTMLElement): void {
  (getFocusable(panel).at(0) ?? panel).focus();
}

// The return target can be stale (removed, or replaced by a re-render). Each candidate is tried
// in order; if none is still in the document, focus is left on the body rather than thrown.
function focusReturnTarget(preferred: HTMLElement | null, anchor: HTMLElement | null): void {
  for (const candidate of [preferred, anchor]) {
    if (candidate?.isConnected === true) {
      candidate.focus();
      return;
    }
  }
  document.body.focus();
}

// The popover is non-modal, so Tab is only contained while focus is already inside the panel.
// Without this, Tab past the last control would leave the panel and could land at the end of body.
function trapTab(event: KeyboardEvent, panel: HTMLElement): void {
  if (!panel.contains(document.activeElement)) {
    return;
  }
  const focusable = getFocusable(panel);
  const first = focusable.at(0);
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) {
    event.preventDefault();
    panel.focus();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === panel)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

// S5, S7, S9: an anchored, non-modal dialog. It is positioned with floating-ui, clamped to the
// viewport, and rendered in a portal so ancestors with overflow cannot clip it. Focus moves into
// the panel on open and returns on close, unless the user pressed outside the panel.
export function Popover({
  anchor,
  open,
  onClose,
  label,
  role = 'dialog',
  placement = 'bottom-start',
  returnFocusTo,
  children,
}: PopoverProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  // Read at close time. Kept in a ref so an inline callback does not restart the focus effect.
  const returnFocusToRef = useRef(returnFocusTo);
  // Set by an outside press, so focus is not pulled back to the anchor from where the user clicked.
  const keepFocusOnCloseRef = useRef(false);
  const isShown = open && anchor !== null;
  const parentPanels = useContext(NestedPanels);
  // The open panels of popovers opened from inside this one.
  const [childPanels] = useState(() => new Set<HTMLElement>());

  useLayoutEffect(() => {
    returnFocusToRef.current = returnFocusTo;
  });

  // Focus moves in on open. The cleanup runs on close and on unmount, so focus always has a
  // sensible place to land.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || anchor === null || panel === null) {
      return undefined;
    }
    keepFocusOnCloseRef.current = false;
    focusFirstInside(panel);
    return () => {
      if (!keepFocusOnCloseRef.current) {
        focusReturnTarget(returnFocusToRef.current?.() ?? null, anchor);
      }
    };
  }, [open, anchor]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!isShown || panel === null || parentPanels === null) {
      return undefined;
    }
    parentPanels.add(panel);
    return () => {
      parentPanels.delete(panel);
    };
  }, [isShown, parentPanels]);

  // Esc and Tab are handled in the capture phase on document. Esc is stopped there because the
  // popover has consumed it: without stopPropagation, the editor and window-level shortcuts would
  // also react to the same keypress. Keyboard closes always return focus, so the flag is reset.
  useEffect(() => {
    if (!open || anchor === null) {
      return undefined;
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        if (childPanels.size > 0) {
          return;
        }
        event.stopPropagation();
        keepFocusOnCloseRef.current = false;
        onClose();
        return;
      }
      if (event.key === 'Tab' && panelRef.current !== null) {
        trapTab(event, panelRef.current);
      }
    }
    // A press on the panel or the anchor is not a dismissal. Clearing the flag here undoes any
    // earlier outside press that the parent chose to ignore.
    function handlePointerDown(event: PointerEvent): void {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const inChild = Array.from(childPanels).some((child) => child.contains(target));
      if (
        panelRef.current?.contains(target) === true ||
        anchor?.contains(target) === true ||
        inChild
      ) {
        keepFocusOnCloseRef.current = false;
        return;
      }
      keepFocusOnCloseRef.current = true;
      onClose();
    }
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [open, anchor, onClose, childPanels]);

  // autoUpdate reruns the position on scroll, resize and layout shift; its cleanup removes every
  // listener and observer it added. The cancelled flag drops a result that resolves after close.
  // The panel stays hidden (see Popover.css) until the first position is applied.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || panel === null || anchor === null) {
      return undefined;
    }
    let cancelled = false;
    const stopAutoUpdate = autoUpdate(anchor, panel, () => {
      void computePosition(anchor, panel, {
        placement,
        strategy: 'fixed',
        middleware: [
          offset(POPOVER_OFFSET_PX),
          flip({ padding: VIEWPORT_PADDING_PX }),
          shift({ padding: VIEWPORT_PADDING_PX }),
          size({
            padding: VIEWPORT_PADDING_PX,
            apply({ availableWidth, availableHeight, elements }) {
              elements.floating.style.maxInlineSize = `${String(availableWidth)}px`;
              elements.floating.style.maxBlockSize = `${String(availableHeight)}px`;
            },
          }),
        ],
      }).then(({ x, y }) => {
        if (cancelled) {
          return;
        }
        panel.style.left = `${String(x)}px`;
        panel.style.top = `${String(y)}px`;
        panel.dataset.placed = '';
      });
    });
    return () => {
      cancelled = true;
      stopAutoUpdate();
    };
  }, [open, anchor, placement]);

  if (!isShown) {
    return null;
  }

  // Non-modal: no aria-modal and no inert background, so the editor stays usable underneath.
  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-label={role === 'dialog' ? label : undefined}
      tabIndex={role === 'dialog' ? -1 : undefined}
      className="ds-popover"
    >
      <NestedPanels value={childPanels}>{children}</NestedPanels>
    </div>,
    // Inside a modal dialog (the mobile bottom sheet) the page behind is inert, so a popover opened
    // from there must live in that dialog to be clickable.
    anchor.closest('dialog') ?? document.body,
  );
}
