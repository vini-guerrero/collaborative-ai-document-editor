// DEBT: jsdom does not implement window.matchMedia. This stub installs only when it is missing and
// answers only "(min-width: Npx)" queries against a viewport width that tests control with
// setViewportWidth(). It does not parse other media features and does not emulate orientation,
// resolution or prefers-* queries. Remove this block once jsdom ships matchMedia or the tests need
// more than min-width.

const DEFAULT_VIEWPORT_WIDTH_PX = 1280;
const MIN_WIDTH_PATTERN = /\(min-width:\s*(\d+(?:\.\d+)?)px\)/;

let viewportWidthPx = DEFAULT_VIEWPORT_WIDTH_PX;
const openLists = new Set<ViewportMediaQueryList>();

function matchesQuery(query: string, widthPx: number): boolean {
  const minWidth = MIN_WIDTH_PATTERN.exec(query)?.[1];
  if (minWidth === undefined) {
    return false;
  }
  return widthPx >= Number(minWidth);
}

// A minimal MediaQueryList: it fires "change" only when its own match result flips.
class ViewportMediaQueryList extends EventTarget {
  readonly media: string;
  private lastMatches: boolean;

  constructor(media: string) {
    super();
    this.media = media;
    this.lastMatches = matchesQuery(media, viewportWidthPx);
    openLists.add(this);
  }

  get matches(): boolean {
    return matchesQuery(this.media, viewportWidthPx);
  }

  syncAndNotify(): void {
    const nowMatches = this.matches;
    if (nowMatches !== this.lastMatches) {
      this.lastMatches = nowMatches;
      this.dispatchEvent(new Event('change'));
    }
  }
}

// Installs the stub only where matchMedia is missing, so a real implementation is never replaced.
export function installMatchMedia(): void {
  if (typeof window.matchMedia === 'function') {
    return;
  }
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): ViewportMediaQueryList => new ViewportMediaQueryList(query),
  });
}

// Sets the simulated viewport width and notifies every query whose result changed.
export function setViewportWidth(widthPx: number): void {
  viewportWidthPx = widthPx;
  for (const list of openLists) {
    list.syncAndNotify();
  }
}

// Restores the default viewport and forgets every query created so far. Called after each test so
// one test's width never leaks into the next.
export function resetMatchMedia(): void {
  viewportWidthPx = DEFAULT_VIEWPORT_WIDTH_PX;
  openLists.clear();
}
