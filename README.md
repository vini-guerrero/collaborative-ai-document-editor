# AI Co-Author Editor

A collaborative AI document editor in the browser. You write Markdown; an AI co-author notices things, speaks up quietly, and never changes the document without a visible diff and your explicit Accept.

> **Status: home screen done.** The project, the `pnpm check` gate and the documents home (list, create, delete, grid/list) are built; the Markdown editor with the AI co-author is next. The editor page is still a plain textarea. Decisions are in `docs/`. This README is a working draft and will evolve with the product.

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
| 12 | Dialog on native `<dialog>` (reviewed: busy guard, native-close sync, focus return) | Done |
| 13 | Responsive layout: useBreakpoint, AppShell (sidebar, rail, drawer), NavItem, IconLink (reviewed) | Done |
| 14 | Documents store: zod schemas, `DocumentStore` over localStorage with index recovery, preview helper (built early, in parallel with 12) | Done |
| 15 | DocumentStore provider and hook, relativeTime, store wired in main | Done |
| 16 | Routing, route error boundaries, editor placeholder (textarea) with serialized autosave (reviewed) | Done |
| 17 | Home shell: navbar, sidebar (disabled items with Soon), loading/error/empty/ready, New document | Done |
| 18 | Grid/List views: ViewToggle, DocumentCard, DocumentRow | Done |
| 19 | Delete flow: always-visible delete button, confirm dialog naming the document, error handling | Done |
| 20 | Home milestone close: Opus review of the home screen (fixes applied), README | Done |
| 21 | Editor milestone plan saved; T2 amended to `@tiptap/markdown` | Done |
| 22 | `src/lib/hash.ts` (FNV-1a) and `src/lib/diff.ts` (word diff adapter) with tests | Done |
| 23 | Markdown adapter (`parseMarkdown`/`serializeMarkdown`, raw HTML never live DOM) | Done |
| 26 | Shared zod contracts in `shared/schemas/` and the `src/` import boundary rule | Done |
| 20b | Home screen aligned to the prototype: navbar, sidebar divider, search, cards, list rows | Done |
| 24 | TipTap editor surface replaces the textarea; `EditorPage`; `@tiptap/*` import ban; leading block markers escaped on save | Done |
| 31 | Design-system Popover (anchored, clamped) and BottomSheet (native dialog) | Done |
| 27 | AI service: `AIProvider`, prompts with nonce-delimited document data, zod-validated output with one retry, fake provider | Done |
| 25, 28-30, 32-43 | Main editor milestone: Markdown adapter, TipTap editor, AI server, flags, suggestions, restructure, history (see [docs/PLAN-EDITOR-MILESTONE.md](docs/PLAN-EDITOR-MILESTONE.md)) | Next: phase 25; 27, 28, 32 in progress |

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
