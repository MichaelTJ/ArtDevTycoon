# Best Practices — Art Gallery Tycoon

This is the **binding contract** for every contributor, human or agent. If you are an
agent picking up a task in this repo, read this file first and read it fully. It is
written so that you never have to go hunting for context.

Rules use RFC-2119 language: **MUST**, **MUST NOT**, **SHOULD**, **MAY**.

---

## 1. Orientation: read these, in this order

| Order | File | Why |
| ----- | ---- | --- |
| 1 | `best-practices.md` (this file) | Rules of engagement |
| 2 | `docs/architecture.md` | How the system fits together and why |
| 3 | `src/lib/types/contracts.ts` | The frozen data contract every layer shares |
| 4 | `docs/agent-log.md` | What other agents already built |
| 5 | The `README.md` inside the directory you own | Local detail for your slice |

You **MUST NOT** begin editing before completing this reading list. It takes about
five minutes and prevents nearly every class of duplicated or conflicting work.

---

## 2. The isolation model (how agents avoid each other)

Concurrent agents corrupt each other in three ways: editing the same file, racing on
the git index, and racing on shared build state. We eliminate all three.

### 2.1 Disjoint file ownership

Every task **MUST** come with an explicit **ownership zone**: a list of path globs.

- You **MUST** confine all writes to your ownership zone.
- You **MUST** treat every path outside your zone as read-only, even to fix an obvious
  bug. Report the bug in your handoff instead.
- Two concurrently running agents **MUST NOT** have overlapping zones. This is the
  orchestrator's responsibility to guarantee before spawning.

Files that are **always** orchestrator-owned and off-limits to task agents:

```
package.json          package-lock.json     vite.config.ts
tsconfig.json         eslint.config.js      prettier.config.js
svelte.config.js      playwright.config.ts  .gitignore
src/lib/types/**      best-practices.md     docs/architecture.md
```

Need a new dependency or a config change? **Do not make it.** Put the request in your
handoff report and stop. The orchestrator applies it centrally, which keeps the
lockfile conflict-free.

### 2.2 Git: worktrees, and who is allowed to run git

Parallel agents that both run Node tooling get their own **git worktree** on their own
branch, created by the orchestrator:

```powershell
git worktree add -b agent/<zone-name> ../adt-wt-<zone-name> main
# node_modules is shared via a junction so we don't reinstall 230 packages per tree:
New-Item -ItemType Junction -Path ../adt-wt-<zone-name>/node_modules -Target ./node_modules
```

This gives each agent a private working directory, a private branch, a private
`.svelte-kit` build cache, and a private git index, while sharing one dependency
install. Nothing an agent does can touch another agent's files.

Rules:

- Task agents **MUST NOT** run any state-changing git command: no `commit`, `add`,
  `merge`, `rebase`, `checkout`, `stash`, `push`, `worktree`. Read-only inspection
  (`git status`, `git diff`, `git log`) is fine.
- The **orchestrator alone** commits and merges. This removes all `index.lock`
  contention and keeps history coherent and reviewable.
- Agents that touch no Node tooling and own a wholly separate top-level directory
  (for example `sidecar/`) **MAY** work directly in the main tree. There is no
  interference risk, and a worktree would only add overhead.

### 2.3 Shared build state

- Agents **MUST NOT** run `npm install`, `npm update`, or edit the lockfile.
- Agents **SHOULD** scope test runs to their own project to cut runtime and avoid
  touching unrelated build output: `npm run test:unit -- --run --project=server`.
- Only one long-lived `npm run dev` server may exist at a time, and it belongs to the
  orchestrator. Agents verify with tests, not with a dev server.

---

## 3. Testing

Testing is not a phase at the end. A component without a test is not done.

### 3.1 The three tiers

| Tier | Runs in | File name | Use for |
| ---- | ------- | --------- | ------- |
| Unit | Node | `foo.test.ts` | Pure logic: scoring, prompt building, validation |
| Component | Real Chromium | `Foo.svelte.test.ts` | Anything that renders |
| E2E | Real Chromium | `*.e2e.ts` in `e2e/` | The full loop through the UI |

The `.svelte.test.ts` suffix is **not cosmetic** — `vite.config.ts` routes files by
that exact pattern to the browser test project. Name a component test `Foo.test.ts`
and it will run in Node, fail to mount, and waste your time.

### 3.2 Rules

- Every exported function in `src/lib/game/**` and `src/lib/server/**` **MUST** have
  unit tests covering the happy path, boundary values, and malformed input.
- Every component in `src/lib/components/**` **MUST** have a `.svelte.test.ts` that
  mounts it, asserts rendered output for representative props, and exercises each
  event or callback it exposes.
- Tests **MUST NOT** touch the network, the filesystem outside a temp dir, or a real
  model. Use the `mock` AI provider, which is deterministic by design.
- Tests **MUST** be deterministic. Any randomness **MUST** be seeded; any clock
  **MUST** be injected or faked. A test that fails one run in twenty is worse than no
  test, because it trains everyone to ignore red.
- Assert on user-visible behaviour and accessible roles/text, not on internal state or
  CSS classes. Class names change constantly; "the payout reads $85" does not.
- `expect: { requireAssertions: true }` is enabled globally — a test body with no
  assertion is a failure, not a pass.

### 3.3 The gate you must pass before reporting done

```powershell
npm run check          # svelte-check: types across .ts and .svelte
npm run lint           # prettier --check + eslint
npm run test:unit -- --run
```

All three **MUST** be green **for the files you own**. If you have inherited a
pre-existing failure from outside your zone, do not fix it — record it in your handoff
report and carry on.

---

## 4. Documentation

The goal: **a new agent should never have to reverse-engineer intent from code.**

- Every directory you create under `src/lib/` and every top-level directory **MUST**
  contain a `README.md` covering: what lives here, the public surface others may
  import, invariants that must hold, and anything deliberately *not* done yet.
- Every exported symbol **MUST** carry a TSDoc comment explaining *why* it exists and
  any non-obvious constraint. Skip the ones that merely restate the signature.
- When you finish, you **MUST** append a handoff entry to `docs/agent-log.md` using
  the template in §6. This is how the next agent inherits your context.
- Update docs **in the same change** as the code. Documentation that lags is
  documentation that lies.

### 4.1 Code comments

Comment the *why*, never the *what*. `// increment the counter` is noise. A note that
SDXL-Turbo requires `guidance_scale=0.0` or it produces garbage is genuinely valuable,
because the code cannot express that constraint on its own. Never leave comments that
narrate your edit ("changed this to fix the bug") — they are addressed to a reviewer
who will be gone in a week.

---

## 5. Code standards

### 5.1 Svelte 5, runes only

Runes mode is **forced on** for all first-party code in `vite.config.ts`. Legacy
syntax is a compile error, not a style preference.

- Use `$state`, `$derived`, `$props`, `$effect`. **MUST NOT** use `export let`, `$:`,
  or `svelte/store`'s `writable` for new state.
- Shared reactive state lives in `.svelte.ts` modules exporting a factory or a single
  instance — not in `writable()` stores.
- `$effect` is a last resort. If you are writing an effect to compute a value, you
  want `$derived`. Reach for effects only for genuine outside-the-graph side effects
  such as timers, subscriptions, and DOM measurement.
- Import app state from `$app/state`, not the deprecated `$app/stores`.
- Prefer snippets (`{#snippet}` / `{@render}`) over slots.

### 5.2 TypeScript

- `strict` is on. **MUST NOT** use `any`, `@ts-ignore`, or non-null `!` to silence the
  compiler. Use `unknown` plus a narrowing guard.
- Data crossing a trust boundary (network, model output, user input) **MUST** be
  validated at runtime, not merely cast. A type assertion on an LLM's JSON is a lie.
- Types shared between layers belong in `src/lib/types/` and nowhere else.

### 5.3 Server / client boundary

- Anything under `src/lib/server/` is server-only; SvelteKit enforces this. Model
  calls, sidecar URLs, and secrets live there.
- API route handlers **MUST** validate their input and **MUST** return typed,
  schema-conformant JSON, including on the error path. Never let a raw exception
  become the response body.
- Secrets come from `$env/dynamic/private`. **MUST NOT** commit a `.env`; update
  `.env.example` instead.

### 5.4 Accessibility and feel

- Interactive elements **MUST** be real `<button>`/`<a>`/`<input>` with accessible
  names. A clickable `<div>` will fail lint and exclude keyboard users.
- Every animation **MUST** be wrapped so it respects `prefers-reduced-motion`.
- Loading and error states are part of the feature, not a follow-up. Every async
  surface needs both.

---

## 6. Spawning and running agents

### 6.1 When to spawn

Spawn a sub-agent when the work is a **self-contained slice with a clean interface**
and its ownership zone is disjoint from every currently running agent. Do not spawn
for work that is faster to do directly, and do not spawn a second agent into a zone
that overlaps a running one — wait for it to land first.

### 6.2 The prompt template

An agent cannot see the conversation that created it. Its prompt **MUST** be
self-sufficient and **MUST** contain all nine sections:

1. **Repo path** — absolute working directory (worktree path if it has one)
2. **Mission** — one paragraph on what to build and, crucially, why
3. **Ownership zone** — exact path globs you may write to
4. **Read-first list** — files to read before writing, per §1
5. **Contract** — the exact types/signatures to implement against
6. **Definition of done** — observable, checkable criteria
7. **Verification commands** — the literal commands to run, per §3.3
8. **Constraints** — the git prohibition (§2.2), the no-install rule (§2.3), and any
   task-specific limits
9. **Handoff format** — instruct it to append to `docs/agent-log.md` and report a
   summary, dependency requests, and known gaps

### 6.3 Handoff entry template

```markdown
## <date> — <agent name>

**Zone:** <globs>
**Built:** <what now exists, in prose>
**Public surface:** <what others may import, with signatures>
**Tests:** <what is covered; the command to run them>
**Decisions:** <non-obvious choices and the reasoning>
**Requests:** <dependencies or config changes needed from the orchestrator>
**Known gaps:** <what is deliberately unfinished, and why>
```

---

## 7. Definition of done

A task is done when, and only when, all of these hold:

- [ ] The feature works, including its loading and error states.
- [ ] Unit tests cover the logic; component tests cover the rendering.
- [ ] `npm run check`, `npm run lint`, and `npm run test:unit -- --run` are green.
- [ ] The directory `README.md` and all TSDoc are current.
- [ ] A handoff entry is appended to `docs/agent-log.md`.
- [ ] No file outside the ownership zone was modified.
- [ ] No `any`, no `@ts-ignore`, no commented-out code, no stray `console.log`.

---

## 8. Product principles

Worth stating, because they should settle most design arguments without escalation:

1. **The game must be playable with zero AI installed.** The `mock` provider is the
   default and is a first-class path, not a stub. It keeps the whole game testable in
   CI and playable on any machine.
2. **Never block the player on a model.** Generation is slow and can fail. Always show
   progress, always offer a way out, never dead-end a run.
3. **The Level 1 prompt modifiers are invisible to the player.** That constraint is
   the core joke of the game — the player thinks they are writing a masterpiece and
   the crayon texture betrays them. Do not surface the modified prompt in the UI.
4. **Build only Level 1.** The features in §7 of the design document are explicitly
   deferred. Leave clean seams for them; implement none of them.
