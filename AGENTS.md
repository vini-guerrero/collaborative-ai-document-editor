# AGENTS.md

Working rules for AI agents and people in this repo. **Draft: this will evolve as the product grows.** If a rule is wrong or in the way, say so and propose a change instead of working around it.

Priority: user instruction > this file and `docs/` > `guidelines/`. `Never` = hard rule. The full general guidelines are in `guidelines/` (CODING, NODEJS, REACT, UIUX); this file is the project-adapted distillation. **Do not read `guidelines/` by default**; open one only when this file is silent on something.

## Project in one paragraph

A browser-based Markdown editor where an AI co-author flags and suggests; the user always sees a diff and must Accept. React + Vite + TipTap front end, a small Hono proxy to OpenRouter, localStorage persistence, no auth, no database. Built so far: the `pnpm check` gate, design system, documents store and the home screen (phases 1-20); the editor page is still a textarea placeholder and the AI server has only `/api/health`. Progress table: `README.md`; next milestone: `docs/PLAN-EDITOR-MILESTONE.md`.

## Source of truth

Read only what the task needs, not everything.

| Need | File |
|---|---|
| What the product does (D1-D17 editor, H1-H7 home) | `docs/PRODUCT-DIRECTION.md` |
| Stack, AI contract, storage, security, structure, packages, gates (T1-T13) | `docs/TECHNICAL-DIRECTION.md` |
| Tokens, components, licenses, responsive (S1-S9) | `docs/DESIGN-DIRECTION.md` |
| Current milestone: ordered phases, scope per phase | `docs/PLAN-HOME-MILESTONE.md` |

Product decisions are settled. Do not re-open them; if code contradicts one, flag it. Cite decision IDs (`D4`, `H5`, `T7`, `S8`) in code comments and test names.

## Project rules

1. **Nothing changes the document without Accept** (T3). Suggestions are decorations; Accept is one transaction.
2. **Contracts live in `shared/schemas/`** as zod, types from `z.infer` (T11). Never hand-duplicate a type.
3. **The OpenRouter key never reaches the browser** (T4). Model names come from config, never from the client (T7).
4. **Model output is untrusted** (T10): validate with zod, render as text only, drop responses whose paragraph hash no longer matches.
5. **Feature code imports UI only from `src/design-system/`**, never `@atlaskit/*` or icon packages directly (S8).
6. **Only permissive licenses** (Apache-2.0, MIT, ISC, BSD). `@atlaskit/icon` and `@atlaskit/logo` are banned; icons are Lucide or custom SVG (S6, S8).
7. **No hover-only affordances**; every interaction has a touch and keyboard path (S9, D17).
8. **No test calls the real model** (T9). Never commit `.env` or secrets. Never log document text or the API key.

## The gate

One command, `pnpm check`, runs: format check, type-aware strict ESLint, `tsc --noEmit`, license check (S8), Vitest, production build (web and server). **It is created before any feature code.**

- Done only when `pnpm check` passes. Fix causes; never suppress errors or warnings (`@ts-ignore`, `eslint-disable`, `any`, non-null `!` need a written reason).
- After every change run the fast checks (format, lint, types). Run tests by scope: affected tests per step, the full suite once before push or done.
- ESLint errors on: undeclared and unused names, shadowing, floating promises, explicit `any`, missing types, `react-hooks` violations, deep imports across features, direct `@atlaskit/*` imports. No `console.log` left behind.
- Report what was run and the real result. Never claim unverified work passes.

## Packages (T12)

- **pnpm only.** Never npm or yarn; never commit another lockfile. Commands: `pnpm dev`, `pnpm test`, `pnpm check`.
- **Exact versions only.** `.npmrc` has `save-exact=true`. No `^`, `~`, ranges or `latest`, dev dependencies included. `packageManager` and `engines` pin pnpm and Node.
- Commit `pnpm-lock.yaml`; install with `pnpm install --frozen-lockfile`.
- Adding a dependency: first prefer the platform, the standard library or code we already have. Verify the exact name exists and is maintained, check its license (S8), add one package at a time, run `pnpm check`, commit alone.
- Upgrading: deliberate, one package at a time, license re-checked, checks run, committed alone. `pnpm audit` shows no high or critical findings.
- Dependency install scripts stay blocked unless explicitly allowlisted with a reason.
- Wrap third-party libraries in an adapter when they touch domain logic (AI provider, storage, design system).

## Coding rules

- Read related files before editing; match existing patterns, naming and style. Take the first option that works: not needed -> reuse -> standard library -> platform feature -> installed dependency -> small edit -> new minimal code.
- Smallest diff that fully solves the task. Never refactor, rename or reformat unrelated code. Before changing a signature or schema, find and update every caller.
- Never leave TODOs, stubs, mock data, dead code, commented-out code or debug output. A deliberate shortcut gets one `DEBT:` comment with its limit and when to revisit.
- Never invent APIs, flags or package names; verify in the repo, lockfile or docs. Never deprecated APIs.
- Bug: reproduce it, fix the root cause, not the symptom. Stuck after two attempts at the same fix: stop, report what failed, propose options.
- Ambiguous requirement: pick the simplest option and state the assumption.
- KISS, YAGNI. Abstract on the third repetition; duplication beats a wrong abstraction. One responsibility per function and module. Pure core, side effects at the edges. Composition over inheritance.
- Functions: one level of abstraction, guard clauses over nesting (at most ~3 levels), at most ~4 parameters, no boolean flag parameters, no hidden inputs or outputs.
- Names state intent; units in the name (`timeout_ms`); no magic numbers or strings. No `utils`/`helpers` dumping grounds: name modules by what they own (`diff`, `hash`).
- Types: strictest checking, no escape hatches. Parse external data at the boundary (API, storage, environment) into validated types, then trust them. Discriminated unions instead of flag combinations; `as const` objects instead of `enum`; immutable by default.
- Errors: never swallow (no empty `catch`). Expected failures are typed results; exceptions are for bugs. Messages state what failed, without secrets. Handle edges: empty, missing, zero, duplicate, non-ASCII.
- Never global mutable state or side effects at import time. Inject IO, clock, randomness and environment at the edges; wrap `window`, `localStorage` and the clock in a module or hook.
- Whatever a scope acquires (listener, timer, request, subscription) the same scope releases, on every path.
- Bound everything: input size, retries, timeouts, caches. Measure before optimizing.
- Comments explain why, not what. Document public APIs: purpose, inputs, errors.

## Frontend rules (React)

- Feature-first per T11: components (UI) / hooks (logic) / API client (IO). Never `fetch` in a component. One component per file; split files over ~200 lines. Never define a component inside another.
- Import direction: `app -> features -> design-system / lib`. Other features are reached only through their `index.ts`.
- TypeScript `strict` and `noUncheckedIndexedAccess`. No `as` casts to silence errors, no `React.FC`. Variants and async state (idle, loading, ready, error) are discriminated unions.
- State at the lowest scope that works: local -> lifted -> URL -> context -> Zustand. Derive values in render; never mirror props or derived data in state. Editor-internal state belongs to the ProseMirror plugins (T3), not React state.
- Effects only synchronize with external systems and always have full deps and cleanup. Never use effects for derived state, event logic or fetching. Reset with `key`. No `useMemo`/`useCallback`/`memo` by default; add after profiling.
- AI calls go through the typed client in `features/ai`: timeout, abort `signal` on every request, one normalized error shape. Handle loading, error, empty and success. AI failure shows the D14 status and never breaks the editor.
- Stable `key` from ids, never the index. Never render `count && <X />`. Dates, numbers and relative times through `Intl`.
- Error boundary per route and around the editor, with fallback and retry. Boundaries do not catch event-handler or async errors; handle those where they occur.
- Security: never `dangerouslySetInnerHTML`; never render user, API or LLM content as HTML or Markdown without sanitizing (T10). No secrets in client code. External `target="_blank"` gets `rel="noopener noreferrer"`. No inline scripts, `eval` or `new Function`.
- Route-level `lazy` + `Suspense`; check bundle cost before adding a library.
- Tests: Vitest + React Testing Library + `user-event`, colocated as `Component.test.tsx`. Query by role, label or text (`data-testid` last). Never test internal state or class names. `findBy*`/`waitFor` and fake timers (for the D4 pause; use `vi.useFakeTimers({ shouldAdvanceTime: true })` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, or `findBy*` can hang), never fixed sleeps. A src test that needs the DOM is a `.tsx` file (jsdom project). The AI is faked at the client boundary. Cover loading, error, empty and success.

## Server rules (Hono, Node)

- ESM only. Layers: route (thin) -> AI service -> `AIProvider`. Request and response objects never enter the service. The app is built by a factory with its dependencies passed in (`createApp(deps)`); a separate entrypoint listens.
- Validate body, params and query with zod at the boundary, reject unknown fields, and serialize responses through schemas (T5).
- Environment is parsed once at startup into a typed config; never read `process.env` elsewhere (T7). Fail fast on missing config.
- One error handler maps typed errors to status codes with one body shape; never send stack traces. Out-of-credit maps to the D14 status.
- Every outbound call has a timeout (`AbortSignal.timeout`) and is cancelled when the client disconnects. Retries are bounded (T5: one).
- Never block the event loop: no `*Sync` calls on request paths. Every promise is awaited or handled; `return await` inside `try`.
- Body size limit and model allowlist enforced here (T7). CORS: same-origin through the Vite proxy; allow only the local dev origin.
- Structured logs to stdout with secrets and document text redacted. Never `eval`, `new Function` or `vm`.
- Tests: the service is unit-tested with a fake `AIProvider`; routes through Hono's in-process request against the factory app. Tests close what they open.

## UI/UX rules

- **Done means seen.** Every screen is looked at rendered (screenshot in the browser pane), not only read as code. Check at 360, 768 and 1280px, light and dark, keyboard only, and 200% zoom. Accessibility check clean once automated (axe or similar); until then a manual keyboard and screen-reader pass. Contrast meets WCAG AA.
- Every data view has loading, empty, error and success states (H6, D14).
- Heuristics that matter here: visible system status (feedback in 100 ms, progress after 1 s, e.g. the card spinner); user control (Accept, Dismiss, Esc, single-step undo D17); error prevention (destructive actions confirm and name the object, H5); recovery (say what happened and how to fix, keep the user's input); consistency (reuse design-system components, never restyle one-off); minimal (one primary action per screen).
- Layout: spacing, sizes and radii from tokens only (S2). No horizontal scroll at 320px; fully usable from 360px (S9). Document text at least 16px with 45-75 characters per line; UI chrome follows the ADS scale. Touch targets at least 44x44 on coarse pointers. Reserve space for async content so layout never shifts.
- Color: semantic tokens only, never raw hex; never color alone to carry meaning (S7). Hover, focus, active, selected, disabled and error states are visibly distinct.
- Buttons act, links navigate; button labels are verbs naming the outcome. Modals are rare (delete confirm only): focus trapped, `Esc` closes, focus returns to the trigger. No toast as the only place an error appears.
- **Disabled controls: the product record wins.** H2 and H3 keep visible, disabled items (a promise of future features); give each a small "Soon" label or tooltip so it explains itself.
- Accessibility: semantic HTML first, ARIA only to fill gaps. Everything reachable and operable by keyboard with a visible focus ring; icon-only controls have accessible names; headings and landmarks are hierarchical; async updates use live regions; hover content is also reachable by focus and touch. Respect `prefers-reduced-motion`.
- Motion explains cause and effect: 150-300 ms, transform and opacity only, never blocking input.
- Content: plain language, sentence case, one term per concept. The AI speaks in neutral, factual one-liners (D8). Never put a placeholder where a label belongs.

## Dropped on purpose (does not fit this project yet)

Revisit when the product grows (Phase 2: sign-in, sync, real users).

- **Server:** PostgreSQL and the data layer, migrations, idempotency keys, durable job queues, authentication and authorization (JWT, passwords, sessions, cookies), multi-instance concerns (shared rate-limit store, trusted proxies, readiness and graceful shutdown), containers and non-root runtime, Fastify and pino defaults (we use Hono), profiling and `AsyncLocalStorage` practice.
- **Frontend:** TanStack Query and its key and mutation rules, React Hook Form, Tailwind, Next.js, auth tokens, virtualization, live connections, i18n and message catalogs, MSW (the AI is faked at our own boundary).
- **UI/UX:** A/B testing, HEART and SUS metrics, scheduled user-testing rounds, native-platform guidance, tables, search, multi-step forms, password rules, Core Web Vitals targets, right-to-left and translation stress tests, consent and dark-pattern rules, media captions.
- **General:** money and time-zone rules, thread-safety rules.

## Agent roles and models

| Role | Model | Does | Does not |
|---|---|---|---|
| **Orchestrator** | Sonnet | Talks to the user, splits work, writes handoff briefs, integrates results, runs `pnpm check`, owns commits | Large implementations itself; design-heavy planning |
| **Planner / Reviewer** | Opus | Plans non-trivial or cross-cutting work; reviews diffs against these rules and the decision IDs | Write the implementation; run long builds |
| **Builder** | Haiku | Implements one well-bounded task from a brief; writes its tests | Make design decisions, change contracts, touch files outside its brief |

Flow: Orchestrator -> (Opus plan, if needed) -> Haiku build -> Opus review (non-trivial changes, or anything touching `shared/`, `server/` or the editor plugins) -> Orchestrator integrates.

Escalate instead of guessing: a builder that hits an ambiguity, a contract change or a rule conflict stops and reports to the orchestrator.

## Handoffs: cold starts and token efficiency

Side agents start with **no memory of the conversation**. Every handoff carries exactly what they need and nothing more.

**Orchestrator, when handing off:**
- Pass **file paths and decision IDs, not pasted contents.** The agent reads what it needs.
- Name the **minimum reading list** (usually 1-3 files plus the relevant IDs). Never tell a builder to read all of `docs/` or `guidelines/`; the rules a builder needs are in this file.
- State the **scope as a whitelist of files** it may create or edit, and what is out of bounds.
- Give **checkable acceptance criteria** (a test passes, `pnpm check` is green, a specific behavior).
- One task per brief, small enough to finish in one pass. Split large work into independent briefs with no shared files, each step building and passing checks before the next.
- Ask for a **short, structured return** so the result is cheap to read back.

**Brief template:**

```
Task: <one sentence>
Why: <decision IDs, e.g. D4, T5>
Read first: <paths, max ~3>
May edit/create: <file whitelist>
Do not touch: <paths or areas>
Done when: <checkable criteria; include `pnpm check` green>
Return: files changed, one line per change, anything unresolved. No code dumps.
```

**Builder, on start:** read the brief, then only the listed files; do not explore the repo or re-read docs unless told. Follow neighboring patterns. Do not widen scope; note adjacent problems in the return instead of fixing them. Run `pnpm check` before returning and report failures verbatim and briefly.

**Reviewer (Opus), on start:** receive the diff and the decision IDs it should satisfy, not the history. Check against these rules and the cited IDs; report findings ranked by severity with file and line. Do not rewrite code.

**Return format (all side agents):**

```
Status: done | blocked | partial
Changed: <path>: <what, one line>
Checks: <pnpm check result>
Open: <questions, risks, follow-ups>
```

## Context hygiene

- Keep this file and the briefs short; long context costs tokens on every cold start.
- Record durable decisions in `docs/` (with an ID), not in chat. A decision that exists only in a conversation is lost to the next agent.
- When a rule here changes, update this file in the same change.

## Git

Work on `development`; `main` is for releases. Short, imperative commit messages. One commit per build phase; in the same commit, update the README build-progress table and any doc the phase changed. Add one dependency or one upgrade per commit. The raw AI session files in `ai-sessions/` are added last, unedited except for masked secrets, as the brief requires.
