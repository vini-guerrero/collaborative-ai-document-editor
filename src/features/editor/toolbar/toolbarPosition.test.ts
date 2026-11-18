import { describe, expect, it } from 'vitest';
import { TOOLBAR_HEIGHT_PX, TOOLBAR_WIDTH_PX, toolbarPosition, type Box } from './toolbarPosition';

// D9, S9: placement above the selection, kept inside the visible area above the keyboard.
// Wide enough for a 560px toolbar with the 16px gutter on both sides.
const SCREEN: Box = { top: 0, left: 0, width: 640, height: 800 };
const SELECTION: Box = { top: 300, left: 150, width: 120, height: 20 };
const GAP = 8;
const PAD = 16;

describe('toolbarPosition', () => {
  it('sits above the selection and starts where it starts, inside the gutter', () => {
    const point = toolbarPosition(SELECTION, SCREEN);
    expect(point.top).toBe(SELECTION.top - GAP - TOOLBAR_HEIGHT_PX);
    expect(point.left).toBe(Math.min(SELECTION.left, SCREEN.width - TOOLBAR_WIDTH_PX - PAD));
  });

  it('moves below the selection when there is no room above', () => {
    const top: Box = { ...SELECTION, top: 30 };
    expect(toolbarPosition(top, SCREEN).top).toBe(top.top + top.height + GAP);
  });

  it('keeps the toolbar above the keyboard when the visual viewport is shorter', () => {
    const keyboardViewport: Box = { top: 0, left: 0, width: 390, height: 400 };
    const low: Box = { ...SELECTION, top: 380 };
    const point = toolbarPosition(low, keyboardViewport);
    expect(point.top).toBeLessThanOrEqual(keyboardViewport.height - TOOLBAR_HEIGHT_PX - PAD);
  });

  it('clamps to the left and right edges with the gutter', () => {
    const leftEdge = toolbarPosition({ ...SELECTION, left: 0, width: 4 }, SCREEN);
    expect(leftEdge.left).toBe(PAD);
    const rightEdge = toolbarPosition({ ...SELECTION, left: 380, width: 4 }, SCREEN);
    expect(rightEdge.left).toBe(SCREEN.width - TOOLBAR_WIDTH_PX - PAD);
  });

  it('respects a visual viewport that is offset inside the layout viewport', () => {
    const offset: Box = { top: 100, left: 20, width: 390, height: 500 };
    const point = toolbarPosition({ ...SELECTION, top: 90 }, offset);
    expect(point.top).toBeGreaterThanOrEqual(offset.top + PAD);
    expect(point.left).toBeGreaterThanOrEqual(offset.left + PAD);
  });

  it('never returns a position past the minimum when the viewport is too small', () => {
    const tiny: Box = { top: 0, left: 0, width: 100, height: 40 };
    const point = toolbarPosition(SELECTION, tiny);
    expect(point.top).toBe(PAD);
    expect(point.left).toBe(PAD);
  });
});
