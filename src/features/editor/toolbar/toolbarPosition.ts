// A rectangle in the layout viewport's client coordinates (getBoundingClientRect).
export interface Box {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface ToolbarPoint {
  readonly top: number;
  readonly left: number;
}

// S9: the toolbar's footprint. The width is its maximum; the CSS shrinks it on narrow screens.
export const TOOLBAR_WIDTH_PX = 360;
export const TOOLBAR_HEIGHT_PX = 44;
const TOOLBAR_GAP_PX = 8;
// S9: 16px is the viewport gutter.
const VIEWPORT_PADDING_PX = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

// D9, S9: places the toolbar above the selection, or below it when there is no room above, and
// keeps it inside the visual viewport. On a phone with the on-screen keyboard open, the visual
// viewport is the area left above the keyboard. `viewport` is window.visualViewport's offsets
// and size, passed in so this stays pure. Both rectangles use the same coordinates.
export function toolbarPosition(anchor: Box, viewport: Box): ToolbarPoint {
  const minTop = viewport.top + VIEWPORT_PADDING_PX;
  const maxTop = viewport.top + viewport.height - TOOLBAR_HEIGHT_PX - VIEWPORT_PADDING_PX;
  const aboveTop = anchor.top - TOOLBAR_GAP_PX - TOOLBAR_HEIGHT_PX;
  const belowTop = anchor.top + anchor.height + TOOLBAR_GAP_PX;
  const top = clamp(aboveTop >= minTop ? aboveTop : belowTop, minTop, maxTop);

  // Starts where the selection starts, as the prototype's bubble does, so it reads as attached.
  const startLeft = anchor.left;
  const minLeft = viewport.left + VIEWPORT_PADDING_PX;
  const maxLeft = viewport.left + viewport.width - TOOLBAR_WIDTH_PX - VIEWPORT_PADDING_PX;
  const left = clamp(startLeft, minLeft, maxLeft);

  return { top, left };
}
