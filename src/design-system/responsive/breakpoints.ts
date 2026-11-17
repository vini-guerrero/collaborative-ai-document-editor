// S9: the breakpoint scale in CSS pixels. The numbers mirror the --bp-* tokens in tokens.css.
// DEBT: CSS custom properties cannot be used inside @media, so these values are duplicated here
// and in component CSS. Keep them in sync with tokens.css. Revisit if the toolchain gains
// custom-media support.
export const BREAKPOINTS = { sm: 480, md: 768, lg: 1024, xl: 1280 } as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// 'base' is any width below the smallest breakpoint.
export type ViewportBreakpoint = 'base' | Breakpoint;
