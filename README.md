# AI Co-Author Editor

A collaborative AI document editor in the browser. You write Markdown; an AI co-author notices things, speaks up quietly, and never changes the document without a visible diff and your explicit Accept.

> **Status: scaffolding.** Product, technical and design decisions are written down; the project and its `pnpm check` gate are being set up before any feature code. This README is a working draft and will evolve with the product.

### Build progress

Updated in the same commit as each phase.

| Phase | Scope | State |
|---|---|---|
| 1 | Package baseline: pnpm, exact pins, Node, env example | Done |
| 2 | Web shell: Vite, React, strict TypeScript | Done |
| 3 | Format and lint (TypeScript pinned to 6.0.x, see T13) | Done |
| 4 | Vitest | Next |
| 5 | Hono server and config | Planned |
| 6 | License check and the `pnpm check` gate | Planned |

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

*Planned; these commands work once the project is scaffolded.*

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
| `docs/` | Product, technical and design direction |
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
