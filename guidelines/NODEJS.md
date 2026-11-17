# Node.js Backend Rules

Priority: user instruction > repo conventions > this file. `Never` = hard rule.
Versions: use the Node version, package manager, and module system (ESM or CommonJS) the repo declares (`package.json`, `.nvmrc`, lockfile). Never mix module systems or package managers. Never deprecated APIs.
Default stack (only if the repo has none): TypeScript strict, Fastify, Zod, PostgreSQL with a typed query layer, pino, Vitest, ESLint.

## Checks
- Done only when this passes (or the repo's own scripts): `tsc --noEmit && eslint . && vitest run`, plus the production build.
- Never `any`, `@ts-ignore`, `eslint-disable`, or non-null `!` without a written reason. Never leave `console.log`.
- ESLint is type-aware (typescript-eslint strict) with `no-shadow`, `no-floating-promises`, `no-explicit-any`, and `no-unused-vars` as errors.

## TypeScript
- `strict` and `noUncheckedIndexedAccess` on. `unknown` and narrowing instead of `any`.
- Validate every external input with a schema at the boundary: HTTP input, environment, queue messages, database JSON, third-party responses. Infer types from schemas.
- Discriminated unions for results and states. `as const` objects instead of `enum`.
- Production runs the built output. Path aliases must resolve at runtime, not only in the type checker.

## Event Loop and Async
- Never block the event loop: no `*Sync` filesystem, crypto, or child-process calls on request paths, no CPU-heavy loops, no huge `JSON.parse` / `JSON.stringify`. Move CPU work to worker threads or a job queue.
- Every promise is awaited or handled. `unhandledRejection` and `uncaughtException` log and exit; the supervisor restarts the process.
- Independent work runs with `Promise.all` under a concurrency limit. Never an unbounded `Promise.all` over a large list. Never sequential `await` in a loop by accident.
- Never pass an async callback to `forEach`. Use `for...of` or `Promise.all(items.map(...))`.
- Inside `try`, `return await` the promise so `catch` sees its rejection.
- Every outbound call has a timeout and cancellation (`AbortSignal.timeout`).
- Streams for large payloads through `pipeline()` from `stream/promises`. Never `.pipe()` without error handling. Never buffer whole files or uploads in memory.
- Every `EventEmitter` has an `error` listener. Async listeners catch their own errors.
- No request data in module-level variables; concurrent requests share them. Request context uses `AsyncLocalStorage`.
- In-memory caches and maps are bounded (max size and TTL). Listeners and timers are removed when done.

## HTTP Service
- Layers: routes (thin) -> services (business rules) -> repositories (data). Request and response objects never enter services.
- `app` is built by a factory without listening; `server` starts it. Dependencies are passed in at that composition root.
- Schemas validate params, query, body, and headers and reject unknown fields. Responses are serialized through schemas.
- One error handler maps typed errors to status codes with one body shape. Never send stack traces.
- Async route errors must reach the error handler: use a framework version that forwards rejections, or wrap handlers.
- Server timeouts are set. Keep-alive timeout is longer than the load balancer's idle timeout.
- Body size limits, pagination with a max size, security headers, CORS allowlist.
- Rate limits use a shared store when more than one instance runs. Configure trusted proxies so client IPs are correct.
- Graceful shutdown on `SIGTERM`: fail readiness, stop accepting, finish in-flight requests, close pools and queues, exit, with a forced deadline.
- Processes are stateless: no in-memory sessions. Scale with processes or containers.
- Environment is parsed and validated once at startup into a typed config. Never read `process.env` elsewhere.
- Structured JSON logs to stdout with a request id and redaction of secrets and PII.

## Data
- One bounded connection pool per process. Pool size times instances stays under the database limit.
- Bound parameters only. Never template-string SQL or unsafe raw-query helpers with user input.
- Inside a transaction every query uses the transaction client. Transactions are short and contain no network calls.
- Prevent N+1: joins, includes, or batched loaders. Select only needed columns. Keyset pagination.
- Migrations are versioned files applied as a deploy step. Never schema sync, push, or development migrate commands in production.
- Money is integer minor units or a decimal type, never a float. Identifiers beyond 2^53 travel as strings.
- Timestamps are UTC ISO strings at the boundary.
- Side-effecting `POST`s accept an idempotency key. Uniqueness is enforced by constraints and upsert.
- Jobs run on a durable queue with retries, backoff, and a dead-letter queue. Never `setTimeout` or in-process cron for work that must not be lost; scheduled jobs run on one instance under a lock.

## Security
- Object-level authorization in services. Never spread a request body into a database write; pick allowed fields.
- Prototype pollution: never deep-merge untrusted objects; reject `__proto__` and `constructor` keys; use `Map` for user-keyed data.
- Query-operator injection: check that values are primitives before they reach a document-database query.
- Never `eval`, `new Function`, or `vm` on untrusted input. Child processes use `execFile` or `spawn` with an argument array.
- User-influenced paths are resolved and checked against a base directory. User-supplied URLs are fetched only from an allowlist.
- No user-supplied regular expressions. Cap input length before matching.
- Passwords use argon2 or bcrypt (async). Tokens come from `crypto.randomBytes` and compare with `crypto.timingSafeEqual`. Never `Math.random()` for security.
- JWT verification fixes the algorithm and checks audience, issuer, and expiry. Session cookies are `httpOnly`, `secure`, `sameSite`.
- Install from the lockfile (`npm ci`). Verify package names before adding. Audit in CI. Review install scripts.
- Run as a non-root user with `NODE_ENV=production` and production dependencies only.

## Performance
- Measure with CPU profiles, flame graphs, and event-loop delay. Alert on event-loop lag.
- Reuse connections (keep-alive agents). Size the heap limit to the container.

## Testing
- Services are unit-tested with fakes. Routes are tested through HTTP injection against a real database in a container.
- Fake timers instead of sleeps. Outbound HTTP is faked at the network boundary.
- Each test isolates its data. Tests close servers, pools, and timers so the runner exits.
