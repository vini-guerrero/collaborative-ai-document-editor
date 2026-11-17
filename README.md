# AI Co-Author Editor

A collaborative AI document editor in the browser. You write Markdown; an AI co-author notices things, speaks up quietly, and never changes the document without a visible diff and your explicit Accept.

> **Status: scaffolded.** The project and its `pnpm check` gate are in place; feature work comes next. Decisions are in `docs/`. This README is a working draft and will evolve with the product.

### Build progress

Updated in the same commit as each phase.

| Phase | Scope | State |
|---|---|---|
| 1 | Package baseline: pnpm, exact pins, Node, env example | Done |
| 2 | Web shell: Vite, React, strict TypeScript | Done |
| 3 | Format and lint (TypeScript pinned to 6.0.x, see T13) | Done |
| 4 | Vitest | Done |
| 5 | Hono server and config (binds 127.0.0.1, `/api/health`) | Done |
| 6 | License check and the `pnpm check` gate | Done |
| 7 | Plan the home screen milestone; record design-system and storage decisions | Done |
| 8 | Vitest projects: node and jsdom, Testing Library, App smoke test | Done |
| 9 | Design-system foundation: vendored ADS tokens, light/dark theme, Icon over Lucide, import bans | Done |
| 10 | Components: Button, IconButton, Lozenge, Spinner, VisuallyHidden | Done |
| 11 | Components: TextField, Avatar, ToggleGroup, EmptyState | Done |
| 14 | Documents store: zod schemas, `DocumentStore` over localStorage with index recovery, preview helper (built early, in parallel with 12) | Done |
| 15 | DocumentStore provider and hook, relativeTime, store wired in main | Done |
| 12 | Dialog on native `<dialog>` (reviewed: busy guard, native-close sync, focus return) | Done |
| 13 | Responsive layout: useBreakpoint, AppShell (sidebar, rail, drawer), NavItem, IconLink (reviewed) | Done |
| 16 | Routing, route error boundaries, editor placeholder (textarea) with serialized autosave (reviewed) | Done |
| 17 | Home shell: navbar, sidebar (disabled items with Soon), loading/error/empty/ready, New document | Done |
| 18-20 | Home screen milestone: grid/list views and cards, delete flow, milestone close (see [docs/PLAN-HOME-MILESTONE.md](docs/PLAN-HOME-MILESTONE.md)) | Next: phase 18 |

## What it is

- A home screen listing your documents (create, open, delete), then a Markdown editor.
- **Ambient mode:** the AI flags passages with subtle underlines (clarity, tone, grammar, questions to the author). **On demand mode:** you invoke it on a selection, a section, or with `/`.
- Suggestions appear as an anchored card with a live inline diff. You Accept, Dismiss or Refine (tone, length, free instruction). Nothing is written until Accept.
- Section restructuring (move, split, merge) with the same preview-then-accept flow.
- Documents and version history are saved in the browser. No account, no database.

Full detail: [docs/PRODUCT-DIRECTION.md](docs/PRODUCT-DIRECTION.md).

## Stack

TypeScript, React, Vite, TipTap (ProseMirror), a small Hono server that proxies AI calls to OpenRouter, Vitest. Details and reasons: [docs/TECHNICAL-DIRECTION.md](docs/TECHNICAL-DIRECTION.md). Design system: [docs/DESIGN-DIRECTION.md](docs/DESIGN-DIRECTION.md).

## Run it locally

These commands work now. `pnpm dev` needs a filled `.env` for the server.

Requirements: Node (version pinned in `.nvmrc`), pnpm (version pinned in `packageManager`; enable it with `corepack enable`), an OpenRouter API key.

```bash
pnpm install --frozen-lockfile
cp .env.example .env   # then set OPENROUTER_API_KEY and model names
pnpm dev               # starts the web app and the AI proxy
```

Other commands:

```bash
pnpm test              # unit tests (Vitest)
pnpm check             # format + lint + types + license check + tests + build
```

Dependencies are pinned to exact versions and installed from the committed lockfile.

The API key stays on the local server and is never sent to the browser.

## Environment variables

Listed in `.env.example` once scaffolded: `OPENROUTER_API_KEY`, one model name per AI task (analyze, rewrite, restructure), and the input size cap.

## Repository map

| Path | Purpose |
|---|---|
| `docs/` | Product, technical and design direction; milestone plan |
| `mockups/` | Medium-fidelity prototype (visual reference only) |
| `AGENTS.md` | Working rules for AI agents and contributors (adapted from `guidelines/`) |
| `guidelines/` | Full general coding, Node, React and UI/UX guidelines (reference) |
| `ai-sessions/` | Raw AI session files, added at the end as the brief requires |

The planned source layout is in [docs/TECHNICAL-DIRECTION.md](docs/TECHNICAL-DIRECTION.md).

## Known limits

- Single user, single browser: documents live in localStorage, so there is no sync or sharing.
- The AI proxy is public-facing only if you deploy it; it is built for local use, with a size cap and model allowlist but no per-IP rate limit.
- Markdown round-trips through the editor can normalize formatting.

## What I'd do differently with more time

To be written when the build is done.
