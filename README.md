# AI Co-Author Editor

A collaborative AI document editor in the browser. You write Markdown; an AI co-author notices things, speaks up quietly, and never changes the document without a visible diff and your explicit Accept.

> **Status: pre-implementation.** Product, technical and design decisions are written down; no application code exists yet. This README is a working draft and will evolve with the product.

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

Requirements: Node 20+, an OpenRouter API key.

```bash
npm install
cp .env.example .env   # then set OPENROUTER_API_KEY
npm run dev            # starts the web app and the AI proxy
```

Other commands:

```bash
npm test               # unit tests (Vitest)
npm run check          # typecheck + lint + license check + tests
```

The API key stays on the local server and is never sent to the browser.

## Repository map

| Path | Purpose |
|---|---|
| `docs/` | Product, technical and design direction |
| `mockups/` | Medium-fidelity prototype (visual reference only) |
| `AGENTS.md` | Working rules for AI agents and contributors |
| `ai-sessions/` | Raw AI session files, added at the end as the brief requires |

The planned source layout is in [docs/TECHNICAL-DIRECTION.md](docs/TECHNICAL-DIRECTION.md).

## What I'd do differently with more time

To be written when the build is done.
