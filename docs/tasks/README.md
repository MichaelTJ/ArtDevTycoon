# Task Specs — how to run the build

Five self-contained specs. Each is written so an implementing agent needs **no other
context**: exact file paths, exact signatures, exact algorithms with worked examples,
and a test table with literal expected values.

These are aimed at fast, cheap models. That drives the writing style: nothing is left
as "use your judgement", every formula is given in code, and every test case states the
expected number rather than describing it. Where a decision could go two ways, the spec
picks one.

---

## The specs

| #   | Spec                                          | Owns                                                                                  | Depends on |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| 01  | [Domain layer](./01-domain.md)                | `src/lib/game/**`, `src/lib/data/**`                                                  | nothing    |
| 02  | [Backend & AI providers](./02-backend.md)     | `src/lib/server/ai/**`, `src/routes/api/**`                                           | 01         |
| 03  | [UI component library](./03-ui-components.md) | `src/lib/components/**`, `static/avatars/**`                                          | nothing    |
| 04  | [Integration](./04-integration.md)            | `src/lib/stores/**`, `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `e2e/**` | 01, 02, 03 |
| 05  | [Python AI sidecar](./05-sidecar.md)          | `sidecar/**`                                                                          | nothing    |

## Execution order

```
Wave 1  (run all three at once — zero file overlap)
   ├── 01 Domain          → worktree ../adt-wt-domain    branch agent/domain
   ├── 03 UI components   → worktree ../adt-wt-ui        branch agent/ui
   └── 05 Sidecar         → worktree ../adt-wt-sidecar   branch agent/sidecar

Wave 2  (after 01 is merged to main)
   └── 02 Backend         → worktree ../adt-wt-backend   branch agent/backend

Wave 3  (after 01, 02, 03 are merged to main)
   └── 04 Integration     → main tree
```

Wave 1's three specs touch entirely disjoint directories, so they cannot corrupt each
other. Spec 02 needs the scoring functions from 01, and spec 04 needs everything, so
those wait.

## Worktrees are already set up

```
C:/Users/JensenM/Documents/My Apps/Art Dev Tycoon   main
C:/Users/JensenM/Documents/My Apps/adt-wt-domain    agent/domain
C:/Users/JensenM/Documents/My Apps/adt-wt-ui        agent/ui
C:/Users/JensenM/Documents/My Apps/adt-wt-backend   agent/backend
C:/Users/JensenM/Documents/My Apps/adt-wt-sidecar   agent/sidecar
```

Each has `node_modules` junctioned to the main checkout, so `npm run check`, `npm run
lint` and `npm run test:unit` all work inside a worktree with no extra install. Every
worktree has its own git index and its own `.svelte-kit` cache, so concurrent agents
never race.

### Merging a finished branch

Agents do not run git. You do, from the main checkout:

```powershell
cd "C:\Users\JensenM\Documents\My Apps\Art Dev Tycoon"
git -C "..\adt-wt-domain" add -A
git -C "..\adt-wt-domain" -c user.name="Agent Domain" -c user.email="agent@local" commit -m "feat(domain): scoring, prompt pipeline and Level 1 brief pool"
git merge --no-ff agent/domain -m "merge: domain layer"
npm run check; npm run lint; npm run test:unit -- --run
```

If a wave-1 branch merges cleanly but breaks `check`, fix it on `main` before starting
the next wave. Do not start wave 2 on a red main.

### Refreshing a worktree after a merge

Wave 2 and 3 agents need the merged work:

```powershell
git -C "..\adt-wt-backend" merge main
```

---

## Prompting an implementing agent

Open the target worktree as the workspace, then paste this, substituting the two
bracketed values:

> Implement the spec at `docs/tasks/[01-domain.md]`.
>
> Read these four files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — the frozen shared types you must build against
> 4. `docs/tasks/[01-domain.md]` — your spec
>
> The spec lists exactly which files to create and which paths you own. Do not create
> or modify any file outside your ownership zone. Do not edit `package.json`,
> `vite.config.ts`, `tsconfig.json`, or anything in `src/lib/types/`. Do not run
> `npm install`. Do not run any git command that changes state — no commit, add,
> checkout, merge, or push.
>
> Implement every file in the spec, including its tests. Then run all three of these
> and fix anything they report in your own files:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run
> ```
>
> Finally, write the directory `README.md` the spec asks for and append your handoff
> entry to `docs/agent-log.md` using the template in `best-practices.md` §6.3.

For spec 05 the verification commands are different; they are listed inside that spec.

### If the agent stalls or drifts

Cheaper models tend to fail in three specific ways here. Watch for them:

- **Inventing a type instead of importing it.** Everything it needs is already in
  `src/lib/types/contracts.ts`. Point it back there.
- **Naming a component test `Foo.test.ts`.** It must be `Foo.svelte.test.ts`, or Vitest
  runs it in Node where it cannot mount, and the failure message is confusing.
- **Reaching for Svelte 4 syntax** (`export let`, `$:`, `writable`). Runes are forced on
  in `vite.config.ts`, so this is a hard compile error. The spec shows the runes form.

## Definition of done for the whole project

- [ ] All five specs implemented and merged into `main`
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green on `main`
- [ ] `npm run test:e2e` passes the full commission loop against the mock provider
- [ ] `npm run dev` gives a playable Level 1 with no models installed
- [ ] With the sidecar running and `AI_PROVIDER=sidecar`, real artwork is generated
