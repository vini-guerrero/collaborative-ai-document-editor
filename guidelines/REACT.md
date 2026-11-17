# React Frontend Rules

Priority: user instruction > repo conventions > this file. `Never` = hard rule.
Versions: use what the repo pins. Read `package.json` before using a version-specific API. Prefer current APIs; never deprecated ones.
Default stack (only if the repo has none): TypeScript strict, Vite, TanStack Query, React Router, React Hook Form, Zod, Tailwind, Vitest.

## Checks
- Done only when this passes (or the repo's own scripts): `tsc --noEmit && eslint . && vitest run && vite build`.
- Never `@ts-ignore`, `eslint-disable`, or `any` without a written reason. Never leave `console.log`.
- ESLint is type-aware (typescript-eslint strict) with `no-shadow`, `no-floating-promises`, `no-explicit-any`, `no-unused-vars`, and `react-hooks` rules as errors.

## Idioms
- One component = one purpose. One hook = one concern.
- Composition (children, slots) over boolean-prop configuration.
- Pure render: no side effects, mutation, `Date.now()`, or `Math.random()` in render.
- Decoupling: UI components do not know where data comes from. Features talk through public exports only.
- Dependency injection: collaborators arrive through props, hook parameters, or context. Wrap globals (`window`, `localStorage`, clock) in a hook or module; never touch them directly in components.
- Resource lifetime (RAII): whatever an effect acquires (listener, timer, subscription, request, object URL) the same effect's cleanup releases.
- Reusability: move code to `shared` on the third use. Shared components take data through props, hold no feature knowledge, and fetch nothing.

## Architecture
- Feature-first: `src/app` (entry, providers, router), `src/features/<name>/{components,hooks,api,types}`, `src/shared/{ui,hooks,lib}`.
- Import direction: `app -> features -> shared`. Never import another feature's internals; use its `index.ts`.
- Layers: components (UI) / hooks (logic) / api (IO). Never call `fetch` inside a component.
- One component per file. Split files over ~200 lines.
- Next.js only: Server Components by default; `"use client"` at leaf components; fetch on the server; no browser-only values during render (hydration mismatch).

## TypeScript
- `strict` and `noUncheckedIndexedAccess` on.
- Never `as` casts to silence errors or non-null `!`. Use `unknown` and narrow.
- Validate all external data (API, storage, URL, forms) with a schema at the boundary. Infer types from schemas.
- Model variants and async state as discriminated unions. Never combine boolean flags.
- `as const` objects instead of `enum`. No `React.FC`.

## State
- Use the lowest scope that works: local state -> lifted -> URL -> context -> store.
- Server data lives only in the query cache. Never copy it into `useState` or a store.
- Derive values during render. Never store derived state or mirror props in state.
- Filters, pagination, tabs, and selected ids live in the URL.
- Context only for low-frequency values (auth, theme, locale). Split contexts by concern.
- Update state immutably.

## Hooks and Effects
- Effects only synchronize with external systems (subscriptions, DOM, timers).
- Never use effects for derived state, event logic, or data fetching.
- Every effect has complete deps and cleanup. Never disable `react-hooks/exhaustive-deps`.
- Reset component state with `key`, not an effect.
- No `useMemo`/`useCallback`/`memo` by default. Add after profiling or to stabilize deps. Skip if React Compiler is on.

## Data Fetching
- One typed API client: base URL from env, auth, timeout, normalized errors.
- The API client refreshes an expired session once and queues concurrent requests behind it.
- Query-key factory per feature. Pass the abort `signal` to every request.
- Mutations invalidate or update exact keys. Optimistic updates include rollback.
- Handle all four states: loading, error, empty, success.
- Paginate lists. Debounce search. Never fetch in a loop.
- Live connections (WebSocket, SSE) reconnect with backoff and refetch on reconnect.

## Components
- Stable `key` from data ids. Never array index for dynamic lists.
- Never define a component inside another component.
- Never render `count && <X />`; use a ternary or boolean.
- Forms: schema-validated, field errors shown, submit disabled while pending.
- Dates, numbers, and currency are formatted through `Intl`, never by hand.
- Styling: one system only, design tokens, mobile-first. Inline `style` only for dynamic values.

## Accessibility
- Semantic HTML first (`button`, `a`, `label`, `nav`, `main`). ARIA only when no native element exists.
- Every interactive element: keyboard reachable, visible focus, accessible name.
- Inputs have labels. Errors linked with `aria-describedby`. Images have `alt`.
- Manage focus on dialogs and route changes. Respect `prefers-reduced-motion`.
- Never put `onClick` on a `div` or `span`.

## Performance
- Route-level `lazy` + `Suspense`.
- Virtualize lists over ~100 rows.
- Images: explicit dimensions, lazy loading, modern formats.
- Keep state close to where it is used. Pass primitives or stable references.
- Import only what is used. Check bundle cost before adding a library.
- Mark expensive non-urgent updates as transitions or deferred values.

## Errors
- Error boundary per route and per risky widget, with fallback and retry.
- Boundaries do not catch event-handler or async errors. Handle those where they occur.
- One error shape from the API client. User-safe message in UI; details in logs.
- Never write an empty `catch`.

## Security
- Never `dangerouslySetInnerHTML` with unsanitized input.
- Never render user, API, or LLM content as HTML or Markdown without sanitizing.
- Never put secrets in client code or public env vars. Everything shipped is public.
- Auth tokens in httpOnly cookies. Never in `localStorage`.
- Reject `javascript:` URLs from user input. External `target="_blank"` gets `rel="noopener noreferrer"`.
- No inline scripts, `eval`, or `new Function`. Stay compatible with a strict CSP.
- Client-side permission checks are UX only. The backend enforces authorization.
- Install from the committed lockfile (`npm ci`). Dependency audit shows no high or critical findings.
- Patch one package at a time, run the checks, commit alone.

## Testing
- Vitest + React Testing Library + `user-event`. Network faked with MSW.
- Query by role, label, or text. `data-testid` is the last resort.
- Never test internal state, class names, or component internals.
- Async UI: `findBy*` or `waitFor`. Never fixed timeouts.
- Shared `renderWithProviders` helper: real providers, fresh query client per test, retries off.
- Cover loading, error, empty, and success states; user interactions; form validation.
- `renderHook` only for hooks with non-trivial logic.
- Test files colocated: `Component.test.tsx`. E2E (Playwright) for critical flows only.
