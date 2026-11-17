# Technical Direction: AI Co-Author Editor

Technical decisions for the product described in `PRODUCT-DIRECTION.md` (D1-D17, H1-H7) and the brief in `NEW - Chiri-Engineering-Assessment-AI-Document-Editor.pdf`. The product is settled; this file covers only what blocks building. Decisions are numbered T1 to T13.

**Constraints from the brief:** no database, auth or Docker; OpenRouter key with a $5 cap; focused 4-6 hour build; public GitHub repo; README with run steps, what was built and what would change with more time.

## Decisions

**T1. Stack: TypeScript + React + Vite + TipTap (ProseMirror).**
It gives exact position mapping for inline tracked changes, anchored cards, the slash menu and single-step undo (D5, D9, D11, D17), and the brief endorses a prebuilt editor.

**T2. The Markdown string is the canonical document.**
The brief says the user writes Markdown, the raw toggle (D15) becomes trivial, and prompts stay simple. TipTap converts to and from it through tiptap-markdown. Round-trip edge cases are accepted for a showcase.

**T3. Flags and previews are ProseMirror plugin state rendered as decorations; the document changes only on Accept, in one transaction.**
This keeps the saved Markdown clean, gives a single Cmd+Z step (D17), and lets flags map through edits and drop when the text changes. Word-level diffs use the `diff` library.

**T4. One `/api/ai` proxy holds the OpenRouter key, behind a provider-agnostic `AIProvider` interface.**
The proxy is a small Hono (Node) server in `server/`. Vite proxies `/api` to it, and one `pnpm dev` starts both. The key is read from `.env` and never reaches the browser. Models are chosen by config per task, so swapping models or providers needs no editor changes. The OpenRouter adapter is first. There is no database or auth.

**T5. AI tasks: `analyze`, `rewrite`, `restructure`.**
`analyze` is cheap and returns flags only (type, span, reason). `rewrite` runs on click. `restructure` returns a move/split/merge operation, not free text (D10). All return zod-validated JSON, with one retry on invalid output. Each task has its own model in config (small and fast for analysis, stronger for rewrites), which matches D3 and the $5 cap.

**T6. Documents and history persist in localStorage behind a `DocumentStore` interface.**
An index plus one entry per document holds Markdown, title, updatedAt and history, saved debounced as the user types (D17, H5). The interface lets a SQLite-backed store replace it later without touching the UI.

*Layout, decided 2026-11-17:* one index key (list of document summaries) plus one key per document, each carrying `schemaVersion`. The zod document schema is feature-local (`src/features/documents/schema.ts`), because the server never sees documents (T11). The store is async, returns typed results (`not-found`, `corrupt`, `quota`), parses at the boundary and drops corrupt entries. A new document is persisted only once its body is non-blank (H5).

**T7. Proxy protection, Phase 1: input size cap, server-side model allowlist, and a stop on out-of-credit that feeds D14.**
All are env-configured through a config module that can become app settings later. The per-IP rate limit is deferred to Phase 2, because the product record doesn't require it and the $5 key cap bounds the worst case.

**T8. Hosting: none. The app runs locally only.**
Reviewers clone it and run it with their own OpenRouter key in `.env`. A concise root `README.md` gives the install and run steps.

**T9. Testing: Vitest unit tests for the pure logic.**
Covered: word diff, flag mapping through edits, content-hash cache, zod schemas, `DocumentStore`, and proxy limits with a mocked provider. No test calls the real model. Playwright, agent-browsing and MCP-driven tests are deferred to a later phase.

**T10. AI security: document text goes into the prompt inside delimiters and is treated as data; the server validates all model output with zod.**
The client renders suggestions only as text through ProseMirror, never raw HTML. A response whose paragraph hash no longer matches is dropped. Prompt injection can at worst produce a bad suggestion, which the user still has to Accept.

**T11. Types and structure are organized for maintainability, so a person or an AI agent can find and change things safely.**
- **One source of truth for contracts.** Anything crossing the client/server boundary (flags, rewrite and restructure requests and responses) is a zod schema in `shared/schemas/`, with its TypeScript type derived by `z.infer`. Types are never hand-duplicated.
- **Feature-local types.** Types used by one feature live in that feature's `types.ts`. There is no global `types/` dump; a type moves to `shared/` only when two sides need it.
- **Feature folders with a public API.** Each feature exposes its public surface through an `index.ts`. Other code imports only from it, and ESLint import rules forbid deep imports across features, so changes stay contained.
- **Path aliases.** `@/` for `src/` and `@shared/` for `shared/`, so no long relative paths.
- **Small, single-purpose files.** One responsibility per file, aiming for under ~200 lines. Prompts are separate files in `server/prompts/`, never inline strings.
- **Traceable to the product record.** Code comments and test names cite the decision they implement (for example `D4`, `H5`, `T7`), so a reviewer or an agent can trace code to intent.
- **Agent-readable repo.** A root `AGENTS.md` (with `CLAUDE.md` pointing to it) holds the architecture map, conventions, the rules above and the commands. One command, `pnpm check` (see T13), is the gate before any change is considered done by a person or an agent.
- **Human in the loop.** The AI-facing surface is small and explicit: schemas, prompts and the `AIProvider` interface are the only places model behavior is defined, so a person can review them without reading the editor code.

**T12. Package management: pnpm, exact versions only.**
pnpm is the only package manager (no `package-lock.json` or `yarn.lock`). Every dependency, dev dependencies included, is pinned to an exact version: `.npmrc` sets `save-exact=true`, and no `^`, `~`, ranges or `latest` appear in `package.json`, so a compromised or broken release cannot arrive unnoticed. `pnpm-lock.yaml` is committed, installs use `pnpm install --frozen-lockfile`, and `packageManager` and `engines` pin the pnpm and Node versions. Upgrades are deliberate: one package at a time, license re-checked (S8), checks run, committed alone. `pnpm audit` must show no high or critical findings, and dependency install scripts stay blocked unless explicitly allowlisted.

**Known audit finding (2026-11-17):** `pnpm audit` reports one high advisory, `picomatch` ReDoS (GHSA-fc5q-39xc-vjpf, <=4.0.7, no patched version published), reached only through dev tooling (Vite, typescript-eslint glob matching) and never shipped or fed user input. Accepted for now; re-run `pnpm audit` on each dependency change and upgrade once a patch exists. `pnpm audit` is not yet part of `pnpm check`.

**T13. Coding gates: one command, adapted guidelines.**
The general guidelines in `guidelines/` (coding, Node, React, UI/UX) are the full reference. Their rules that fit this project are distilled into `AGENTS.md`, and the ones that do not (database, auth, queues, A/B testing, i18n, and similar) are dropped there on purpose and listed. `pnpm check` runs format check, type-aware strict ESLint, `tsc --noEmit`, the license check (S8), Vitest and the production build; it is created before any feature code. Failures are fixed at the cause, never suppressed.

**TypeScript is pinned to 6.0.x on purpose.** typescript-eslint (type-aware rules) does not yet support TypeScript 7 (native port); checked 2026-11-17 on typescript-eslint 8.73.0. Revisit when typescript-eslint supports TS 7, as one deliberate upgrade (T12).

## Defaults decided without asking

- Single `package.json` (no workspace), Node 24 (pinned in `.nvmrc`); `pnpm dev` starts Vite and Hono together.
- Zod schemas live in `shared/schemas/` and are used by both server and client (see T11).
- `react-router` with browser history, so the Back button returns home (H7).
- Zustand for editor and AI UI state.
- Plain CSS with variables, ported from the mockup; no UI kit.
- The `diff` library for word-level diffs; a small hash helper for the D4 cache.
- Strict TypeScript, ESLint and Prettier.
- `.env` is gitignored and `.env.example` is committed.
- Work happens on `development`; remote is `git@github.com:vini-guerrero/collaborative-ai-document-editor.git`.
- Raw AI session `.jsonl` files go in `ai-sessions/`, committed unedited (only secrets masked) as the brief requires. They are added last, once the work is done.

## Proposed file tree

```
chiri/
├── README.md                    # install / run, what was built, what next
├── guidelines/                  # full general guidelines (cold reference; distilled in AGENTS.md)
├── .npmrc  .nvmrc  pnpm-lock.yaml   # save-exact, pinned Node, committed lockfile (T12)
├── AGENTS.md                    # architecture map, conventions, commands (CLAUDE.md points here)
├── docs/                        # PRODUCT-, TECHNICAL-, DESIGN-DIRECTION.md
├── .env.example                 # OPENROUTER_API_KEY, model names, size cap
├── package.json  tsconfig.json  vite.config.ts  vitest.config.ts  eslint.config.js  index.html
├── mockups/  +  assessment PDF
├── ai-sessions/                 # raw session files, secrets masked (added last)
├── shared/                      # contracts used by both client and server
│   └── schemas/
│       ├── flag.ts              # zod + inferred type: flag kinds, span, reason
│       ├── rewrite.ts           # rewrite request / response, refine options (D6)
│       ├── restructure.ts       # move / split / merge operation (D10)
│       ├── errors.ts            # AI unavailable / out of credit (D14)
│       └── index.ts
├── server/
│   ├── index.ts                 # Hono app, /api/ai
│   ├── config.ts                # env now, app settings later
│   ├── guards.ts                # size cap, model allowlist, credit stop (T7)
│   ├── prompts/                 # analyze.ts, rewrite.ts, restructure.ts (delimited input, T10)
│   └── providers/
│       ├── types.ts             # AIProvider interface (T4)
│       └── openrouter.ts
└── src/
    ├── main.tsx  App.tsx  styles/
    ├── routes/                  # HomePage, EditorPage
    ├── features/                # each folder: index.ts (public API), types.ts, *.test.ts beside code
    │   ├── home/                # grid/list, empty state, delete confirm (H1-H7)
    │   ├── editor/
    │   │   ├── Editor.tsx
    │   │   ├── extensions/      # flags plugin, preview plugin, slash menu, floating toolbar
    │   │   ├── components/      # SuggestionCard, HistoryTimeline, RawToggle, StatusIndicator
    │   │   └── types.ts
    │   ├── ai/                  # client, analyze scheduler (D4), content-hash cache, types.ts
    │   └── documents/           # DocumentStore.ts, localStorageStore.ts, types.ts (T6)
    └── lib/                     # pure helpers: diff.ts, hash.ts (no feature imports)
```

## Phase 2: future improvements

Per-IP rate limiting and settings-driven limits, Playwright / agent-browsing / MCP tests, IndexedDB or SQLite-backed `DocumentStore`, hosted deployment.
