# Coding Rules

Priority: user instruction > repo conventions > this file. `Never` = hard rule.
Language-agnostic.
Versions: use what the repo pins. Read the manifest and lockfile before using a version-specific API. Never deprecated APIs.

## Agent Workflow
- Read related files before editing. Match existing patterns, naming, style.
- Before writing code take the first option that works: not needed -> reuse repo code -> standard library -> platform or framework feature -> installed dependency -> small edit to existing code -> new minimal code.
- Smallest diff that fully solves the task. Never refactor, rename, or reformat unrelated code.
- Large task: split it into small steps. Each step builds and passes checks before the next.
- Before changing a signature, schema, or public behavior, find and update every caller.
- Minimal never removes: boundary validation, error handling, security, data integrity, accessibility, requested behavior, tests for non-trivial logic.
- Never leave TODOs, placeholders, stubs, mock data, dead code, or debug output. A deliberate shortcut gets one `DEBT:` comment with its limit and when to revisit.
- Never invent APIs, flags, or package names. Verify in the repo, lockfile, or docs.
- Never run destructive or irreversible commands (delete data, drop tables, overwrite files outside the task) without an explicit request.
- Ambiguous requirement: pick the simplest option and state the assumption.
- Bug: reproduce it, then fix the root cause, never the symptom.
- Stuck after two attempts at the same fix: stop, report what failed, propose options. Never hack around it.
- Done only when format, lint, type check or compile (warnings as errors), tests, and build all pass. Fix causes; never suppress errors or warnings.
- Static gate first: if the repo has no single command for format, lint, type check, and tests, create it before writing features.
- After every change run the fast static checks (format, lint, types). Run tests by scope: affected tests per step, the full suite once before push or done.
- The gate fails on undeclared names, unused code, variable shadowing, missing or implicit types, and ignored results.
- Report what was run and the real result. Never claim unverified work passes.

## Principles
Apply when they fit the project; skip any that only add ceremony.
- KISS. YAGNI. Abstract on the third repetition; duplication beats a wrong abstraction.
- Single responsibility: one reason to change per function, type, and module.
- Pure core, side effects at the edges.
- Composition over inheritance.
- Dependency injection: collaborators arrive as parameters or constructor arguments, wired once at the entrypoint.
- Resource lifetime (RAII): the scope that acquires a resource releases it on every path, including errors.
- Decoupling: depend on small interfaces defined by the consumer, not on concrete IO.
- Reusability: shared code is pure, parameterized, and free of feature knowledge.

## Functions
- One task at one level of abstraction.
- Guard clauses and early returns over nesting. At most ~3 levels deep.
- At most ~4 parameters; group related ones into a type. No boolean flag parameters.
- Return a value or cause an effect, not both.
- No hidden inputs or outputs: never read globals or mutate arguments unexpectedly.

## Naming
- Names state intent. Follow the language convention and the repo. No abbreviations or type prefixes.
- Put units in the name or the type (`timeout_ms`).
- No magic numbers or strings. Use named constants.

## Types and Data
- Strictest checking the language offers. Never the escape hatch (untyped values, unchecked casts).
- Parse external data at the boundary into validated types. Inside, trust the types.
- Make illegal states unrepresentable: sum types or enums instead of flag combinations.
- Immutable by default. Mutate in the smallest scope.
- Distinct types for ids, money, and units instead of bare primitives.
- Absence is explicit (optional type). Never sentinel values like `-1` or `""`.
- Money is never floating point. Time is UTC and timezone-aware.

## Errors
- Handle or propagate with context. Never swallow: no empty handler, no ignored result.
- Expected failures are typed errors or results. Exceptions and panics are for bugs and unrecoverable states.
- Never use errors for normal control flow.
- Fail fast at startup and on violated invariants.
- Validate at trust boundaries, not at every internal call.
- Handle the edges explicitly: empty, missing, zero, negative, maximum, duplicate, non-ASCII.
- Messages state what failed and with which input, without secrets.

## State and Side Effects
- Never global mutable state. Pass state explicitly.
- IO, clock, randomness, and environment are injected at the edges. The core is deterministic.
- Never side effects at import or static-initialization time.
- State shared across threads or tasks is guarded or avoided. Prefer immutable data and message passing.

## Structure
- Organize by feature. Each module has a small public API and hides the rest.
- Dependencies point inward: IO depends on logic, never the reverse. No circular dependencies.
- Never `utils` or `helpers` dumping grounds. Name modules by what they own.
- Config comes from the environment, validated once at startup. Never secrets in code.

## Comments and Docs
- Comments explain why, never what.
- Never commented-out code.
- Document public APIs: purpose, inputs, errors.

## Performance
- Measure before optimizing. Fix the algorithm and data structure first.
- No repeated work inside loops: hoist it or batch it (queries, allocations, IO).
- Bound everything: memory, concurrency, queues, retries, input size, timeouts.

## Dependencies
- Add one only when it clearly beats owning the code. Verify the exact name and that it is maintained.
- Pin through the lockfile and commit it.
- Wrap a third-party library in an adapter when it touches domain logic.

## Delivery
- README: prerequisites, install/run/test commands, env vars (`.env.example`), architecture, trade-offs, known limits.
- The project runs from a clean clone with the documented commands.
