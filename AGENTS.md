# AGENTS.md

Working rules for AI agents and people in this repo. **Draft: this will evolve as the product grows.** If a rule here is wrong or in the way, say so and propose a change instead of working around it.

## Project in one paragraph

A browser-based Markdown editor where an AI co-author flags and suggests; the user always sees a diff and must Accept. React + Vite + TipTap front end, a small Hono proxy to OpenRouter, localStorage persistence, no auth, no database. Pre-implementation: decisions exist, code does not yet.

## Source of truth

Read only what the task needs, not everything.

| Need | File |
|---|---|
| What the product does (D1-D17 editor, H1-H7 home) | `docs/PRODUCT-DIRECTION.md` |
| Stack, AI contract, storage, security, structure (T1-T11) | `docs/TECHNICAL-DIRECTION.md` |
| Tokens, components, licenses, responsive (S1-S9) | `docs/DESIGN-DIRECTION.md` |

Product decisions are settled. Do not re-open them; if code contradicts a decision, flag it. Cite decision IDs (`D4`, `H5`, `T7`, `S8`) in code comments and test names.

## Hard rules

1. **Nothing changes the document without Accept** (T3). Suggestions are decorations; Accept is one transaction.
2. **Contracts live in `shared/schemas/`** as zod, with types from `z.infer` (T11). Never hand-duplicate a type.
3. **The OpenRouter key never reaches the browser** (T4). Model names come from config, never from the client (T7).
4. **Model output is untrusted.** Validate with zod, render as text only, drop responses whose paragraph hash no longer matches (T10).
5. **Feature code imports UI only from `src/design-system/`**, never `@atlaskit/*` or icon packages directly (S8).
6. **Only permissive licenses** (Apache-2.0, MIT, ISC, BSD). `@atlaskit/icon` and `@atlaskit/logo` are banned. Icons are Lucide or custom SVG (S6, S8).
7. **No hover-only affordances;** every interaction has a touch and keyboard path (S9, D17).
8. **No code that calls the real model in tests** (T9).
9. Small, single-purpose files (aim under ~200 lines). Prompts are separate files in `server/prompts/`. Each feature folder exposes an `index.ts`; no deep imports across features.
10. Never commit `.env` or secrets.

## Commands

*Available once scaffolded.*

```bash
npm run dev      # web app + AI proxy
npm test         # Vitest
npm run check    # typecheck + lint + license check + tests
```

`npm run check` must pass before any change is called done.

## Agent roles and models

| Role | Model | Does | Does not |
|---|---|---|---|
| **Orchestrator** | Sonnet | Talks to the user, splits work, writes handoff briefs, integrates results, runs `npm run check`, owns commits | Large implementations itself; design-heavy planning |
| **Planner / Reviewer** | Opus | Plans non-trivial or cross-cutting work; reviews diffs against the rules above and the decision IDs | Write the implementation; run long builds |
| **Builder** | Haiku | Implements one well-bounded task from a brief; writes its tests | Make design decisions, change contracts, touch files outside its brief |

Flow: Orchestrator -> (Opus plan, if needed) -> Haiku build -> Opus review (when the change is non-trivial or touches `shared/`, `server/` or the editor plugins) -> Orchestrator integrates.

Escalate instead of guessing: a builder that hits an ambiguity, a contract change or a rule conflict stops and reports to the orchestrator.

## Handoffs: cold starts and token efficiency

Side agents start with **no memory of the conversation**. Every handoff must carry exactly what they need and nothing more.

**Orchestrator, when handing off:**
- Pass **file paths and decision IDs, not pasted contents.** The agent reads what it needs.
- Name the **minimum reading list** (usually 1-3 files, plus the relevant IDs). Do not tell a builder to read all of `docs/`.
- State the **scope as a whitelist of files** it may create or edit, and what is out of bounds.
- Give **acceptance criteria that can be checked** (a test passes, `npm run check` is green, a specific behavior).
- Keep one task per brief, small enough to finish in one pass. Split large work into independent briefs with no shared files.
- Ask for a **short, structured return** (below) so the result is cheap to read back.

**Brief template:**

```
Task: <one sentence>
Why: <decision IDs, e.g. D4, T5>
Read first: <paths, max ~3>
May edit/create: <file whitelist>
Do not touch: <paths or areas>
Done when: <checkable criteria; include `npm run check` green>
Return: files changed, one line per change, anything unresolved. No code dumps.
```

**Builder, on start:**
- Read the brief, then only the listed files. Do not explore the repo or re-read the docs unless the brief says so.
- Follow existing patterns in neighboring files before inventing new ones.
- Do not widen scope. Note adjacent problems in the return instead of fixing them.
- Run `npm run check` before returning; report failures verbatim and briefly.

**Reviewer (Opus), on start:**
- Receive the diff and the decision IDs it should satisfy, not the whole history.
- Check against the hard rules and cited IDs; report findings ranked by severity with file and line. Do not rewrite code.

**Return format (all side agents):**

```
Status: done | blocked | partial
Changed: <path>: <what, one line>
Checks: <npm run check result>
Open: <questions, risks, follow-ups>
```

## Context hygiene

- Keep this file and the briefs short; long context costs tokens on every cold start.
- Record durable decisions in `docs/` (with an ID), not in chat. A decision that exists only in a conversation is lost to the next agent.
- When a rule here changes, update this file in the same change.

## Git

Work on `development`; main is for releases. Short, imperative commit messages. The raw AI session files in `ai-sessions/` are added last, unedited except for masked secrets, as the brief requires.
