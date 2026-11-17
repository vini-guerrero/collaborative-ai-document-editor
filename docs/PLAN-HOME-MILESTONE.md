# Plan: home screen milestone

Planned by Opus on 2026-11-17. Scope: the documents home (H1-H7), a localStorage `DocumentStore` (T6), an editor placeholder so documents can be created end to end, and the design-system foundation they need. Each phase is one commit; the orchestrator updates the README progress table in it. Phase numbers continue from the scaffold (1-6).

## Decisions (2026-11-17)

- **Design system:** ADS tokens vendored as CSS, no `@atlaskit/*` package, all components custom (S1). The ADS component packages depend on the banned `@atlaskit/icon`.
- **Typography:** ADS typography tokens; document text stays at least 16px.
- **Document schema:** feature-local, `src/features/documents/schema.ts` (T6).
- **Editor placeholder:** a plain textarea, marked `DEBT:` until TipTap arrives.
- **New document kept:** only once its body is non-blank (H5).
- **Undo (D17)** does not apply on the home screen: delete is permanent with confirmation (H5).

## Rules for every brief

- Builders never edit `package.json` or the lockfile; the orchestrator adds each dependency alone, in the VM, verified on the registry (license per S8, published more than 1 day ago because of pnpm's minimum release age), with `pnpm check` after.
- Library APIs come from the package's `.d.ts` in `node_modules`, not from memory.
- "Seen" items are checked by the orchestrator in the browser pane: 360, 768 and 1280px, light and dark, keyboard only, 200% zoom.
- Opus reviews phases marked **[review]**.

## Phases

Dependencies to add before the phase that needs them: `lucide-react` (P8), `react-router` (P15), `jsdom`, `@testing-library/dom`, `@testing-library/react`, `@testing-library/user-event` (P8). Skip jest-dom and axe for now (manual a11y pass).

| Phase | Scope | Edits (whitelist) | Done when |
|---|---|---|---|
| 7 | Docs: S1/S4 amendment, T6 layout, this plan | `docs/*`, `README.md` | Written with IDs and date |
| 8 **[review]** | Vitest projects: `node` (server, scripts, shared, `*.test.ts`) and `dom` (jsdom, `*.test.tsx`, RTL cleanup in setup) plus one App smoke test | `vitest.config.ts`, `src/test/setup.ts`, `src/App.test.tsx` | Both projects pass, existing tests unchanged |
| 9 | Design-system foundation: vendored ADS token CSS (light, dark, typography, spacing) with LICENSE and source note, `tokens.css` aliases and breakpoints, `theme.ts` (light/dark/auto, set before render), `Icon` wrapper over Lucide, ESLint bans `@atlaskit/*` everywhere and `lucide-react` outside `src/design-system` | `src/design-system/{tokens.css,theme.ts,index.ts,icons/*,vendor/*}`, `src/main.tsx`, `src/vite-env.d.ts`, `eslint.config.js` | Icon test passes. Seen: surface color light and dark, no non-localhost requests |
| 10 | Button, IconButton (44px on coarse pointers), Lozenge ("Soon"), Spinner (reduced motion), VisuallyHidden | `src/design-system/components/*` | RTL tests by role: disabled and focus states |
| 11 | TextField (label, never a placeholder as label), Avatar, ToggleGroup, EmptyState | `src/design-system/components/*` | Tests pass |
| 12 **[review]** | Dialog on native `<dialog>`: title, description, Esc, focus returns to trigger, one destructive action plus Cancel | `components/Dialog/*`, `src/test/setup.ts` | Tests: Esc, cancel, confirm, focus return. Seen: focus trapped, 360px fit |
| 13 **[review]** | Responsive layout: breakpoints, `useBreakpoint`, AppShell (sidebar >= lg, icon rail at md, drawer below md), NavItem (current, disabled + Soon) | `src/design-system/responsive/*`, `components/{AppShell,NavItem}/*` | Drawer and NavItem tests. Seen: three widths, no horizontal scroll at 320px |
| 14 **[review]** | Documents feature: zod schema, async `DocumentStore` with typed results (`not-found`, `corrupt`, `quota`), `createLocalStorageStore`, `preview.ts` (plain text, 160 chars max) | `src/features/documents/*` | Node tests with an in-memory Storage fake: empty, corrupt index, quota, order, delete, non-ASCII |
| 15 | Store provider and hook, `relativeTime` with `Intl.RelativeTimeFormat` | `src/features/documents/{DocumentStoreContext.tsx,index.ts}`, `src/lib/relativeTime.ts`, `src/main.tsx` | relativeTime tests incl. future-clock edge |
| 16 **[review]** | Routing (`/`, `/documents/:id`, `*`), error boundary per route with retry, editor placeholder (title field, textarea, 500 ms debounced autosave, flush on unmount and pagehide, no save of an empty draft) | `src/app/*`, `src/App.tsx`, `src/features/editor/*` | Fake-timer tests; seen: browser Back returns home |
| 17 | Home shell: navbar (H3), sidebar (H2, disabled items with "Soon"), `useDocuments` (loading/error/ready), empty state (H6) | `src/features/home/*` | Tests: loading, error and retry, empty, ready |
| 18 | Views: Grid/List toggle (H4), `DocumentCard` (stretched link), `DocumentRow` | `src/features/home/*` | Toggle, order, link tests. Seen: long titles, 1..N columns |
| 19 | Delete flow (H5): always-visible delete button, dialog naming the document, error keeps dialog open | `src/features/home/*` | Cancel, confirm, store-error tests. Seen: keyboard-only delete |
| 20 **[review]** | Milestone close: README table and full "seen" pass (create, edit, back, list, delete, empty, dark, zoom, keyboard, contrast) | `README.md` | Review of the milestone diff |

## Risks

- CSS custom properties cannot be used in `@media`; breakpoint numbers are duplicated in `breakpoints.ts` and CSS with a comment (accepted `DEBT:`).
- jsdom may lack `dialog.showModal`; a minimal stub goes in the test setup with a `DEBT:` comment.
- Vendored token CSS must be checked for size and for any remote `@import` before use.
- Pinned versions go stale under the minimum release age; re-check dates at install time.
