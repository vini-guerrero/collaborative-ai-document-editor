# Plan: main document editor milestone

Planned by Opus on 2026-11-17. Scope: replace the textarea placeholder (`src/features/editor/EditorPlaceholderPage.tsx`) with the real Markdown editor and the AI co-author surfaces (D1-D17), the AI server contract (T4, T5, T7, T10) and the design-system pieces they need (S5). Phase numbers continue after the home milestone (`docs/PLAN-HOME-MILESTONE.md`, phases 7-20). Each phase is one commit; the orchestrator updates the README progress table in it.

Decisions marked **Proposed** use the Opus recommendation as the default until the user says otherwise; decisions 1 and 7 are decided (see the table).

## Rules for every brief

- Builders never edit `package.json` or the lockfile. The orchestrator adds each dependency alone, in the VM, at an exact version verified on the registry (permissive license per S8, published more than 1 day ago because of pnpm's minimum release age), runs `pnpm check`, and commits it alone.
- Library APIs come from the package's `.d.ts` in `node_modules`, not from memory.
- Done when always includes `pnpm check` green. Builders cannot run pnpm; the orchestrator does.
- "Seen" = the orchestrator restarts the dev server in the VM, then checks the browser pane at 360, 768 and 1280px, light and dark, keyboard only, 200% zoom.
- Opus reviews phases marked **[R]**.

## Order and parallel sets

1. The editor works end to end first: 22-25 (plain editing, Markdown round trip, autosave).
2. AI contract and server: 26-30, can run alongside 22-25.
3. Design-system popovers: 31-32, also parallel.
4. Flags: 33-35. 5. Suggestion card, diff, accept, refine: 36-38. 6. On-demand entry points: 39-40. 7. Restructure: 41. 8. History and undo: 42. 9. Close: 43.

Parallel sets (no shared files): {22, 23, 26, 31}, {24/25, 27-29, 32}, {37, 41-core}. Phases 39 and 40 both register extensions in `src/features/editor/extensions/index.ts`, so they run one after the other. Only phase 24 touches `src/app/router.tsx`.

## Phases

**21 Docs.** Write this plan, amend T2 to the official `@tiptap/markdown` (if approved). Edit: `docs/*`, `README.md`.

**22 lib.** `src/lib/hash.ts` (FNV-1a, sync, for the D4 cache and the paragraph check) and `src/lib/diff.ts` (word diff wrapping `diff`, typed ops) plus tests. Why: T3, T10, D4. Done: node tests for empty, identical, non-ASCII, whitespace, punctuation.

**23 [R] Markdown adapter.** `src/features/editor/markdown/{extensions.ts,markdown.ts}`: StarterKit, Placeholder ("Write something, or press / for AI commands"), Markdown; `parseMarkdown`/`serializeMarkdown` over a headless Editor. Why: T2, D13, D15. Done: jsdom round-trip tests (headings, lists, emphasis, code, links, blank doc, non-ASCII); raw HTML in the source never becomes live DOM.

**24 [R] Editor surface.** `EditorSurface.tsx` (`useEditor`, `onReady(editor)`, markdown on update) replaces the textarea; rename the placeholder page to `EditorPage` and remove its `DEBT:`; add an ESLint ban on `@tiptap/*` outside `src/features/editor`. Edit: `src/features/editor/*`, `src/app/router.tsx`, `eslint.config.js`, `src/test/setup.ts`. Why: T1, T2, D13, D17. Done: page tests drive the editor through `editor.commands`; autosave, flush on Back, no save of an empty draft still pass. Seen: typing, lists, undo, reload keeps text.

**25 Top bar.** Title moves into the top bar (H5); Visual/Markdown toggle with a raw textarea that re-parses on switch back (D15); Ambient/On demand toggle (D1, state only); AI status slot; History and Raw go to overflow below md (S9). Done: toggle round trip and title save tests. Seen: 360px.

**26 [R] Shared contracts.** `shared/schemas/{flag,rewrite,restructure,errors,index}.ts`: flag (kind, exact-substring `quote`, `reason` max 140 chars, at most 2 flags per D16); rewrite (span, instructions, tone, length, `answer` for question flags); restructure (move/split/merge by section index); errors (`out_of_credit`, `unavailable`, `invalid_request`, `too_large`); a request union keyed by `task`. All objects strict. ESLint: `shared/` and `server/` may not import `src/`. Why: T5, T11, D3, D6, D10, D14, D16. Done: node tests reject unknown fields, limits, non-ASCII.

**27 [R] AI service.** `AIProvider` interface (`complete({model, system, user, maxOutputTokens, signal})` returning a typed result); `server/prompts/{analyze,rewrite,restructure}.ts` with document text inside a nonce-tagged delimiter as data (T10); `server/ai/service.ts` (JSON parse, zod check, one retry, drop flags whose quote is not in the paragraph, identical text reported as "no change"); test-only fake provider. Why: T4, T5, T10. Done: valid, invalid-then-valid, invalid twice, injection text in the document, quote not found.

**28 [R] Route and guards.** `POST /api/ai`: Hono `bodyLimit` plus a character cap from `MAX_INPUT_CHARS`; model per task from config only (allowlist, T7); in-memory credit stop (after one 402, short-circuit until restart); `AbortSignal.any` of a timeout and client disconnect; error mapping 400/413/402/503 with one body shape; logs carry task, status, duration, never text or the key. Done: in-process tests with the fake provider, including that the key is in no response or log line.

**29 [R] OpenRouter adapter.** Plain `fetch` to `/api/v1/chat/completions`, no SDK. 402 -> out of credit; 401/403/429/5xx/timeout -> unavailable; cap tokens. Edit: `server/providers/openrouter.ts`, `server/main.ts`. Done: tests with an injected fetch; the orchestrator runs one live smoke call per task with the real key (budget: see decision 7).

**30 AI client.** `src/features/ai/client.ts` (timeout, `signal`, responses parsed with the shared schemas, one normalized error); `aiStatus.ts` (store over `useSyncExternalStore`: ready, working, unavailable, out_of_credit); `StatusIndicator` on Lozenge with text and icon (not color alone). Done: fake-fetch tests for each status; out of credit stays until reload; unavailable recovers on the next success.

**31 [R] Popover and BottomSheet.** Anchored Popover (`@floating-ui/dom`, clamped to the viewport, Esc closes, focus returns) and BottomSheet below md (S9). Seen: popover clamps at 360px.

**32 Menu and Select.** Keyboard-operable Menu (arrows, Enter, Esc, typeahead) and Select for the D6 dropdowns, slash menu and overflow.

**33 [R] Flags plugin.** ProseMirror plugin state holding flags per textblock; flags map through `tr.mapping` and drop when their text changes; inline decorations per kind; meta transactions use `addToHistory: false`. Why: T3, D2, D16, D17. Done: node tests on an `EditorState` built from `getSchema(extensions)` (no view): insert before a flag, edit inside it, split and join, at most 2 flags.

**34 [R] Analyze scheduler.** Pure core plus hook: runs on leaving a paragraph or after a 3 s pause, one paragraph per call with its heading and neighbors as context; bounded hash cache (LRU of 200); aborts in-flight calls; drops the response if the paragraph hash changed; paused in On demand mode, raw view, and when status is not ready. Why: D4, D14, T10. Done: fake-timer and fake-client tests (never fires mid-typing, cache hit, stale response dropped, out of credit pauses).

**35 Flag UI.** Underline style per kind, different by more than color (S5, S7); popover with the reason and "View suggestion" opened by tap, click or Enter; a "next flag" key so flags are reachable without hover (D17); question flags get an answer field that leads to a rewrite. Seen: keyboard path.

**36 [R] Preview and accept.** Preview plugin: word diff shown as delete marks plus insert widgets, text only; `applySuggestion` writes one transaction wrapped in `closeHistory`; editing the range closes the card and drops the flag. Why: T3, D5, D17. Done: accept is exactly one undo step, nothing changes before Accept, a hash mismatch rejects the suggestion.

**37 Suggestion card.** Kind, reason, spinner while generating, "No changes suggested", the D14 error text ("Your text is unchanged"); Accept and Dismiss; Tab accepts, Esc dismisses; bottom sheet below md. Done: RTL tests for loading, error, empty, success.

**38 Refine.** Pure reducer (rounds, accumulated instructions, tone and length, step-back n/m, diff always against the original) and card controls (Select dropdowns, free input with a contextual placeholder). Why: D6.

**39 Toolbar and Improve section.** Floating selection toolbar (Rewrite, Fix tone, Shorten, instruction field) and a visible-on-touch "Improve section" heading button. Why: D9, S9. Seen: above the on-screen keyboard (`visualViewport`).

**40 [R] Slash menu.** `@tiptap/suggestion` with `/`; Space or Esc keeps the `/` as text; never opens over a selection; actions: rewrite paragraph, change tone, ask what's missing, restructure section. Why: D9, D12.

**41 [R] Restructure.** Pure `sections.ts` (outline plus move/split/merge as one transaction); preview with an accent bar at the new place and a dashed ghost at the old place; reuses the card. Why: D10, D11. Done: node tests per operation, invalid indexes, undo is one step.

**42 [R] History.** Optional `label` (80 chars max) on `HistoryEntrySchema`, schemaVersion unchanged; Accept records an AI entry; "You" checkpoints on idle saves; cap 200 entries plus a byte budget; Restore is one undoable transaction plus a new entry; collapsible `HistoryTimeline`. Why: D7, D17, T6. Done: old documents still parse; cap and restore tests.

**43 [R] Close.** README table, full seen pass, Opus security review of `server/` and `shared/`, bundle size (editor route lazy-loaded), `pnpm audit`.

## Packages (checked on the registry 2026-11-17)

Install the TipTap 3.34.0 set first, in this order (MIT, published 2026-11-13, React 19 within peers): `@tiptap/pm`, `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extensions` (Placeholder). Then `@tiptap/markdown` 3.34.0 (pulls `marked`), `diff` 9.0.0 (BSD-3-Clause, no dependencies), `@floating-ui/dom` 1.8.0 (MIT), and `@tiptap/suggestion` 3.34.0 before phase 40. Keep all `@tiptap/*` on one exact version; upgrades move them together, one package per commit (T12). Re-check publish dates at install time.

Rejected: `tiptap-markdown` 0.9.0 (named in T2): community-maintained, last release 2025-09-08, pulls markdown-it and extras. No OpenRouter SDK: the adapter uses `fetch`.

## Security

- The key is read only in `server/config.ts`, never with a `VITE_` prefix; a test asserts it never appears in a response or log line.
- `bodyLimit` plus the `MAX_INPUT_CHARS` cap on the whole request; output tokens capped.
- Models come only from config per task; strict schemas reject a client-sent `model`.
- Prompt injection (T10): document text sits inside a nonce delimiter as data; output is zod-checked and each quote must be a substring of the paragraph; suggestions render as text only (never Markdown or HTML); a changed paragraph hash drops the response; Accept is still required.
- Server binds to loopback; CORS only for the dev origin; logs carry no text.

## D14 out-of-credit state

Server: the adapter maps an OpenRouter 402 to `out_of_credit`; the service latches it (the T7 credit stop) and returns 402 without calling the provider until restart. Client: the status stays out of credit for the session; the indicator reads "Out of credit" with an icon; ambient analysis pauses, existing flags stay visible; the card says "Out of credit. Your text is unchanged."; on-demand entry points stay usable and open that message. AI unavailable recovers: ambient analysis retries after a bounded backoff (60 s).

## Testing split

Node: schemas, server, `hash`/`diff`, plugin logic on an `EditorState` from `getSchema(extensions)` with no view (flag mapping, one undo step, restructure, scheduler, refine reducer). jsdom: Markdown round trip with a headless Editor and components rendered standalone with props. jsdom gaps (`contenteditable` input, selection, `coordsAtPos`, `getClientRects`): stub Range rects in `setup.ts` with a `DEBT:` comment. Typing, IME, positioning and slash keystrokes are verified by "seen" in the browser pane only.

## Decisions

| # | Decision | Recommended | State |
|---|---|---|---|
| 1 | Replace `tiptap-markdown` with the official `@tiptap/markdown` (amends T2) | Yes | **Decided 2026-11-17: yes** |
| 2 | Drop the Zustand default: ProseMirror plugin state plus a small `useSyncExternalStore` store | Yes | Proposed |
| 3 | Add `@floating-ui/dom` instead of writing positioning | Yes | Proposed |
| 4 | Flag spans are an exact quote, not offsets; rewrites return plain text, so formatting marks inside a replaced phrase are lost (`DEBT:`) | Yes | Proposed |
| 5 | One `POST /api/ai` with a `task` field (T4) | Yes | Proposed |
| 6 | "You" history checkpoints: one entry after 2 minutes idle, one before each AI accept | Yes | Proposed |
| 7 | Cheap models per task, and a budget for live smoke calls against the $5 cap | User to choose | **Decided 2026-11-17: model names stay empty in `.env`; the user configures them later. No live calls are made until the user supplies the key and models; tests use the fake provider only.** |

## Risks

Markdown round-trip loss (tables are not in StarterKit; raw HTML in the source). jsdom gaps hide input bugs, so the browser pane is the real check for typing and positioning. History merges an accept with adjacent typing unless `closeHistory` is used. 200 full copies in history can hit the localStorage quota (byte budget in phase 42). Cheap models may return invalid JSON (one retry, then "unavailable"). The on-screen keyboard can cover the toolbar and card (`visualViewport`). Frequent TipTap releases can stall installs on the minimum release age. `@tiptap/react` optional dependencies grow the license-check surface. React 19 StrictMode mounts the editor twice (`immediatelyRender`). The ProseMirror bundle adds weight, so the editor route must be lazy-loaded.
