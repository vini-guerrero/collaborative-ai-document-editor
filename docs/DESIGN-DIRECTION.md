# Design Direction: AI Co-Author Editor

Design system direction for the product in `PRODUCT-DIRECTION.md` (D1-D17, H1-H7), built under the stack in `TECHNICAL-DIRECTION.md` (T1-T11). The initial prototype in `../mockups/medium-fidelity-prototype.html` is a visual reference only, not a source of final tokens. Decisions are numbered S1 to S9.

**Guiding principle (from the product):** the user writes; the AI is a co-author that speaks up quietly. The design system's job is to make the AI feel like a colleague's margin note: calm, precise, never louder than the user's own text.

## Decisions

**S1. Foundation: Atlassian Design System (ADS) tokens, custom components.** *(Amended 2026-11-17.)*
The look comes from ADS design tokens (color, spacing, typography, radius, elevation, motion). The ADS component packages cannot be used: `@atlaskit/button`, `modal-dialog`, `avatar` and `empty-state` all depend on `@atlaskit/icon`, which S8 bans, and the rest pull in `@compiled/react`, `@emotion` and a feature-gate client. No `@atlaskit/*` package is installed at all. Instead the Apache-2.0 token CSS (light, dark, typography, spacing) is vendored into `src/design-system/vendor/ads-tokens/` with its LICENSE and a note of the source package and version, and every component is custom, plain CSS plus React, in `src/design-system/`. Product-specific AI surfaces (S5) are built the same way, so the whole app reads as one system. Updating the vendored tokens is a deliberate, dated change (S8 re-check).

**S2. Tokens first.**
All color, spacing, typography, radius, elevation and motion values come from the vendored ADS design tokens (S1), exposed as CSS variables. No hard-coded hex or pixel values in feature code. Product-specific values (flag underline, diff insert/delete, restructure accent bar) are defined once as semantic aliases of ADS tokens in `src/design-system/tokens.css`, for example `--ai-flag-underline` and `--ai-diff-insert-bg`.

**S3. Theming: light and dark from day one through tokens.**
ADS theming switches the token set; no component carries its own theme logic. Light is the default (matching the mockup); dark is a token swap with no per-component work.

**S4. Component inventory (mapped from the product record).**
*Amended 2026-11-17: the "Source" column below names the ADS component each custom one is modelled on; none of the `@atlaskit/*` component packages is installed (S1). Each is a custom component in `src/design-system/components/`.*

| Product need | Source |
|---|---|
| Navbar, left menu, disabled items (H2, H3) | ADS primitives + menu/navigation components |
| Buttons (New document, Accept, Dismiss, Refine) | ADS Button |
| Grid / List toggle (H4), Raw Markdown toggle (D15) | ADS toggle / button group |
| Document card and list row (H4) | Custom, ADS primitives + tokens |
| Empty state (H6) | ADS Empty state |
| Delete confirmation (H5) | ADS Modal dialog |
| Tone and Length dropdowns (D6) | ADS Dropdown menu / Select |
| Hover reason tooltip (D2) | ADS Tooltip |
| Status indicator "AI unavailable / Out of credit" (D14) | ADS Lozenge / Inline message |
| Generating spinner (D14) | ADS Spinner |
| Avatar placeholder (H3), disabled search (H3) | ADS Avatar, Textfield |
| Title field in editor top bar (H5, H7) | ADS Textfield (borderless variant) |

Exact package names and versions are confirmed at install time.

**S5. Custom AI components (built from ADS tokens, not available in ADS).**
- **Flag underline (D2, D16):** dotted underline decoration, one style per flag type (clarity, tone, grammar, question), differentiated by more than color.
- **Suggestion card (D5, D6):** anchored popover with type, one-line reason (D8), Accept / Dismiss / Refine, tone and length controls, accumulating-instruction input, step-back arrows.
- **Inline diff preview (D5):** word-level insert and delete styling in the text.
- **Restructure preview (D11):** accent bar at the new position and a dashed ghost at the old one.
- **Floating selection toolbar and slash menu (D9, D12).**
- **History timeline (D7):** collapsible, entries labeled You or AI, with restore.

**S6. Icons: not from the Atlassian packages.**
`@atlaskit/icon` and `@atlaskit/logo` are excluded even though their published LICENSE is Apache-2.0 (see S8): the forum reports of a narrower ADG license on icons and logos are unresolved, and Atlassian logos and marks are trademarks. Icons use Lucide (`lucide-react`, ISC) behind a small `Icon` wrapper, so the set can change in one place. Any icon Lucide lacks is a custom inline SVG in `src/design-system/icons/`, drawn in the same 24px stroke style. ADS components that require `@atlaskit/icon` internally are either wrapped with icons passed as props or replaced by a custom component (S4). Atlassian logos, names and marks are never used in the UI.

**S7. Accessibility and interaction baseline.**
Keyboard paths as in D17 (Tab accepts, Esc dismisses, flags reachable without hover), visible focus rings from tokens, color never the only carrier of meaning (flag types and diffs also differ by style or label), WCAG AA contrast through ADS tokens, and `prefers-reduced-motion` respected for card and preview animation.

**S8. Commercial-use policy: permissive licenses only, verified and enforced.**
Only packages under a permissive license (Apache-2.0, MIT, ISC, BSD) may be installed. Anything else (ADG-restricted, GPL/AGPL, "SEE LICENSE", unlicensed) is blocked and replaced by a free alternative or a custom component.

Checked on 2026-11-17 (registry `license` field and the LICENSE file inside the package tarball): `@atlaskit/tokens`, `primitives`, `css`, `button`, `modal-dialog`, `dropdown-menu`, `popup`, `tooltip`, `avatar`, `textfield`, `spinner`, `lozenge`, `toggle`, `empty-state`, `theme`, `select` are Apache-2.0; `lucide-react` is ISC; `@radix-ui/react-popover` is MIT. `@atlaskit/icon` and `@atlaskit/logo` are also Apache-2.0 as published, but stay excluded (S6) because public sources describe them as ADG-licensed and the question is unresolved. The Atlassian design guidelines and brand marks are not a code license, so they are used only as inspiration, never copied.

Enforcement:
1. **Allowlist script in `pnpm check` (T11):** `license-checker` (or equivalent) fails the build if any dependency, including transitive ones, has a license outside the allowlist, or if `@atlaskit/icon` or `@atlaskit/logo` appears in the tree.
2. **Wrapper layer:** feature code imports only from `src/design-system/` (Button, Dialog, Menu, Tooltip, Icon, and so on), never from `@atlaskit/*` directly, enforced by an ESLint import rule. If a package is later found not permitted, only its wrapper changes.
3. **Re-check on every new design-system dependency and version bump,** recorded here with the date.
4. **Implemented (phase 6):** `scripts/check-licenses.ts` reads `pnpm licenses list --json`, allows Apache-2.0, MIT, ISC, BSD-2/3-Clause and 0BSD (SPDX `OR` passes if one side is allowed), and bans `@atlaskit/icon` and `@atlaskit/logo`. A short exception list in the script is matched by package name and license, each with a written reason; adding one is a human decision. Current exceptions, all dev-only tooling not shipped: `minimatch` and `@isaacs/nonrecursive-glob-match` (BlueOak-1.0.0, permissive), `caniuse-lite` (CC-BY-4.0, data, attribution only), `lightningcss` (MPL-2.0, file-level copyleft, unmodified build tool). Verified 2026-11-17.
5. This is an engineering check, not legal advice; confirm with counsel before a commercial launch.

**S9. Responsive design: mobile-first, usable from 360px, designed for touch as well as pointer.**
- **Breakpoints are tokens** (`--bp-sm` 480, `--bp-md` 768, `--bp-lg` 1024, `--bp-xl` 1280) defined once in `tokens.css` and used through a single `useBreakpoint` hook and CSS container/media queries. No ad hoc media queries in feature code.
- **Home (H1-H4):** the left menu is a persistent column from `lg`, an icon rail at `md`, and a drawer opened from a navbar menu button below `md`. The disabled search collapses to an icon on small screens. The grid is `auto-fill` with a minimum card width, so it goes from several columns to one; the list view drops the preview column below `md`.
- **Editor (D1-D17):** a single column with a comfortable reading measure (about 65-75 characters), centered with side gutters that shrink on small screens. The top bar keeps back arrow, title and the essential toggles, moving History and Raw toggle into an overflow menu below `md`.
- **Suggestion card (D5, D6):** an anchored popover from `md` up; on small screens a bottom sheet (custom, because ADS has none) that keeps the flagged text visible above it. Refine controls stack vertically.
- **Floating toolbar and slash menu (D9, D12):** repositioned and clamped to the viewport; on touch they sit above the on-screen keyboard (using the visual viewport).
- **No hover-only affordances.** Everything the product defines through hover has a touch and keyboard equivalent: flag reason and "View suggestion" open on tap, card delete (H5) is always visible on touch, and heading "Improve section" (D9) is a visible control on touch.
- **Touch targets** are at least 44x44px on coarse pointers, at least 24px on fine pointers (WCAG 2.2).
- **Text and zoom:** sizes in `rem`, layouts survive 200% zoom and long titles without horizontal scroll.
- **Verification:** each custom component and screen is checked at 360, 768 and 1280px; this becomes Playwright viewport tests later (T9), and until then a manual checklist in the PR template.

## Where it lives

```
src/design-system/
├── tokens.css          # ADS token import + product semantic aliases + breakpoints (S2, S9)
├── theme.ts            # light/dark switch (S3)
├── responsive/         # useBreakpoint hook, bottom-sheet, drawer (S9)
├── components/         # wrappers over ADS (S4), each with index.ts, types.ts, test
├── ai/                 # custom AI components (S5)
└── icons/              # Icon wrapper, Lucide set + custom SVGs (S6)
scripts/check-licenses.*  # permissive-license allowlist, run by pnpm check (S8)
```

## Open questions (not blocking until the first UI work)

- Final flag-type visual language: color plus underline style per type (D3), to be drawn on the editor mockup.
- Whether ADS typography replaces the system font stack used in the prototype.
- Wordmark and app name; "WebApp" remains the placeholder (H1).

## Phase 2

Visual regression tests for the system, a documented component gallery, density modes, and a brand pass replacing the placeholder name and avatar.
