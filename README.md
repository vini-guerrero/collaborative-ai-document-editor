# AI Co-Author Editor

A Markdown editor in the browser with an AI co-author. The AI flags passages and suggests rewrites; nothing changes in the document without a visible diff and your explicit Accept.

## Features

- **Home:** list, create, open and delete documents (grid or list).
- **Editor:** Markdown in a rich editor with a formatting toolbar (undo, redo, headings, bold, italic, strikethrough, code, lists, quote, code block) and a raw Markdown view. Autosave and version history with restore. A footer shows the last edit, the revision count and the save status, with a standard or wide layout, History and the theme switch.
- **Export:** download the document as a `.md` file from the button beside the title.
- **Ambient mode:** the AI underlines passages (clarity, tone, grammar, questions to the author) after you pause typing. **On Demand mode:** you invoke it on a selection, a section, or with `/`.
- **Suggestions:** an anchored card with a live word diff. Accept, Dismiss or Refine (tone, length, free instruction).
- **Restructure:** move, split or merge sections, with the same preview-then-accept flow.
- **Theme:** light and dark, following the system or set with the toggle. The brand colour is Atlassian purple, derived from the ADS purple scale, with AAA text contrast on filled and text colours.

Documents and history are stored in the browser (localStorage). No account, no database.

## Stack

TypeScript, React, Vite, TipTap (ProseMirror), a small Hono server that proxies AI calls to OpenRouter, Vitest. Reasons and details: [docs/TECHNICAL-DIRECTION.md](docs/TECHNICAL-DIRECTION.md).

## Requirements

- **Node 24.22.3** (pinned in `.nvmrc` and `engines`).
- **pnpm 12.21.0** (pinned in `packageManager`). With Node installed, run `corepack enable` and the right version is used.
- **An OpenRouter API key** for the AI features: <https://openrouter.ai/keys>. Free models (names ending in `:free`) work but are rate limited.
- A modern browser.

## Setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

Edit `.env` and set the key and one model per AI task:

| Variable                       | Required | Meaning                                                              |
| ------------------------------ | -------- | -------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`           | yes      | Server-only key. It never reaches the browser.                       |
| `MODEL_ANALYZE`                | yes      | Model for Ambient analysis, for example `provider/model:free`.       |
| `MODEL_REWRITE`                | yes      | Model for rewrites and refinements.                                  |
| `MODEL_RESTRUCTURE`            | yes      | Model for section restructuring.                                     |
| `MAX_INPUT_CHARS`              | yes      | Largest text the proxy accepts, in characters (default `20000`).     |
| `PORT`                         | no       | API port (default `8787`).                                           |
| `VITE_AI_IDLE_PAUSE_SECONDS`   | no       | Seconds of typing pause before Ambient analyzes, 1-60 (default `5`). |

Then start both the web app and the API:

```bash
pnpm dev
```

Open <http://localhost:5173>. The web app proxies `/api` to the server on `127.0.0.1:8787`. Restart `pnpm dev` after changing `.env`.

The server refuses to start with missing or invalid values and names the keys that are wrong (never their values).

## Commands

```bash
pnpm dev          # web app (5173) and API (8787)
pnpm test         # unit and component tests
pnpm check        # format, lint, types, license check, tests, production build
pnpm format       # apply Prettier
```

`pnpm check` is the gate: a change is done when it passes. Dependencies are exact versions installed from the committed lockfile.

## Repository map

| Path          | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| `src/`        | Web app: `app`, `features` (home, documents, editor, ai), `design-system`, `lib` |
| `server/`     | Hono API: routes, AI service, OpenRouter adapter, prompts   |
| `shared/`     | zod contracts shared by web and server                      |
| `docs/`       | Product, technical and design direction                     |
| `mockups/`    | Medium-fidelity prototype (visual reference)                |
| `AGENTS.md`   | Working rules for AI agents and contributors                |
| `guidelines/` | General coding, Node, React and UI/UX guidelines (reference) |

## Limits

- Single user, single browser: documents live in localStorage, with no sync or sharing.
- The API is built for local use: it binds to localhost, with an input size cap and a model allowlist, but no per-IP rate limit.
- Markdown can be normalized when it round-trips through the editor.
- Free OpenRouter models have a daily request cap; when it is reached the AI shows as unavailable.

## What I'd do differently with more time

- Run the AI against a real provider contract test in CI instead of fakes only.
- Add browser-level tests (Playwright) for the flows that jsdom cannot cover well, such as selection, focus and popovers.
- Add sync and accounts, then move storage off localStorage: real data models for documents and history in a database, a migrations setup, and a persistence layer behind the existing storage interface.
- Add more slash actions, including ones focused on code blocks (explain, fix, add comments).
- Add richer structured logging on the server, with the same redaction rules.
- Add a settings screen to tweak AI options, such as the model per task and the idle pause.
- Add links and horizontal rules to the formatting toolbar, which needs a small URL input.
- Let the user pick the restructure operation (move, split, merge) in the slash menu.
