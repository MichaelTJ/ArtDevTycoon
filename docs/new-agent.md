# /new-agent — Art Dev Tycoon kickoff

This is the **kickoff procedure** for the agent that received `/new-agent`. You are the
**orchestrator**. Execute every step below **in order**. Do not skip, reorder, or merge
steps. Do not improvise a shorter path.

Wrap-up (test, commit, merge, push, worktree removal) is **`/end-agent`**, which follows
`docs/end-agent.md`. This file **MUST NOT** commit, merge, or push.

Rules use RFC-2119 language: **MUST**, **MUST NOT**, **SHOULD**, **MAY**. Product and
engineering law still lives in [`best-practices.md`](../best-practices.md) — this file
only sequences how you start work.

---

## Step 1 — Read the contract

Read [`best-practices.md`](../best-practices.md) **end to end**. Do not read any other
project file until this step is done.

That file is the binding contract: ownership zones, git isolation, test gates, Svelte 5
runes, no server, no model download without a player action, and the nine-section
implementer prompt.

---

## Step 2 — Route the rest of the reading

Read [`docs/tasks/README.md`](./tasks/README.md). That is this repo’s **routing index**.
Do **not** read every spec.

From the index, choose a **short** reading list:

| Always                                                        | Why                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`docs/architecture.md`](./architecture.md)                   | How layers fit; which decisions are load-bearing                                             |
| [`src/lib/types/contracts.ts`](../src/lib/types/contracts.ts) | Frozen shared types — **only if** the request might touch data, phases, save, or engine DTOs |

Then add **only**:

- The existing `docs/tasks/<spec>.md` files whose **ownership zones overlap** what the
  user asked for (or the closest shipped feature).
- The **tail** of [`docs/agent-log.md`](./agent-log.md) for those zones — do not read the
  whole log.
- The `README.md` inside each directory you expect to own.

Stop after roughly **8–10 files** if you still cannot form a plan. Surface the gap; do
not keep reading.

---

## Step 3 — Classify the request

Pick exactly one:

1. **New slice** — no existing spec covers it. Next unused spec number (see §Numbering
   below). One `docs/tasks/NN-slug.md`.
2. **Resume** — an existing spec or branch already owns this. Do not file a duplicate.
3. **Related bundle** — several tasks in one user request, possibly spanning modules.
   This is **one job**. Plan them as sequential steps on **one** worktree. **MUST NOT**
   bounce the user to run `/new-agent` again per task.
4. **Ambiguous product** — two or more reasonable designs. Ask **one** pointed
   multiple-choice question and wait. Do not proceed to Step 5 until they answer.

A bundle that spans modules is **not** automatically ambiguous.

If the plan would require a **new top-level dependency**, a **`contracts.ts` schema
change**, a **new framework**, or an edit to an orchestrator-owned file listed in
`best-practices.md` §2.1, **STOP and ask** before writing the spec — unless the user
already approved that exception in this conversation.

---

## Step 4 — Git hygiene

Run read-only git inspection (`git status`, `git branch`, `git log -5`). You **MUST**
be in the **main checkout**:

`C:\Users\JensenM\Documents\My Apps\Art Dev Tycoon`

not a leftover `adt-wt-*` worktree.

**MUST STOP and ask** if any of these hold:

- The working tree has uncommitted changes **you did not write this session**.
- You are already on a feature / `agent/*` branch and it is not obvious whether to
  resume it.
- Another agent’s worktree already owns an overlapping zone.

Do **not** stash, checkout, reset, or commit to “make it clean.” Ask.

If the tree is clean (or the only dirty files are ones you just wrote as orchestrator
docs in this same kickoff), continue.

---

## Step 5 — Write the spec (the plan)

Write a verifiable spec at `docs/tasks/NN-slug.md` **before any `src/` edit**. Follow
the house style in §Spec template below.

The spec **MUST**:

- List **assumptions** at the top, not buried in a later section.
- Name an **ownership zone** (new files + targeted edits) and an explicit **MUST NOT**
  list (always include the orchestrator-owned set from `best-practices.md` §2.1 unless
  the user already approved an exception).
- Give **locked product rules**, exact files, signatures or UI copy, and a **test
  table** with literal expected values — same density as specs 27–28, not a vibe doc.
- Name the **worktree** and **branch**:
  `git worktree add -b agent/<zone-name> ../adt-wt-<zone-name> main`
- Include a **definition of done** that matches `best-practices.md` §7.

Also draft the one-line index row you will add to `docs/tasks/README.md` after approval
(do not leave the index stale once implementation starts). You **MAY** add that row in
this step as part of the plan; it is still documentation, not product code.

**MUST NOT** edit `src/` in this step.

---

## Step 6 — Plan-approval gate (STOP)

**STOP here.** Present the plan to the user and wait for **explicit approval** before
creating a worktree, spawning an implementer, or writing implementation code.

Your message **MUST** include:

1. Path to the spec you wrote.
2. **Assumptions** (bullet list).
3. **Ownership zone** (globs).
4. Worktree path and branch name.
5. What you will **not** do (out of scope, deferred, orchestrator-owned files).
6. At most **one** remaining multiple-choice question, if something is still blocking.

Do not treat silence, “looks good so far,” or discussion of copy as approval. Wait for
a clear go-ahead (e.g. “approved”, “go”, “implement”).

---

## Step 7 — After approval: isolate

Create a private worktree from `main` (PowerShell, from the main checkout):

```powershell
git worktree add -b agent/<zone-name> ../adt-wt-<zone-name> main
New-Item -ItemType Junction -Path ../adt-wt-<zone-name>/node_modules -Target ./node_modules
```

`<zone-name>` is kebab-case and matches the spec (e.g. `welcome-tutorial`).

The spec drafted in Step 5 will **not** be in the new worktree (it is uncommitted on
the main checkout). **Copy** `docs/tasks/NN-slug.md` and any `docs/tasks/README.md`
index edit into the worktree so the implementer can see them.

**MAY** skip the worktree and work on a new `agent/<zone-name>` branch in the main
tree **only when** all of these are true (`best-practices.md` §2.2):

- No other agent is active.
- The zone is a leaf nobody else is touching.
- The main tree is otherwise clean.

Prefer a worktree whenever the zone is wide (`+page`, `gameState`, `StudioScene`,
shared components).

**MUST NOT** run `npm install`. The junction is the install.

---

## Step 8 — Spawn the implementer

Spawn **one** [Task](https://cursor.com) sub-agent **in this conversation**, with its
working directory set to the worktree (or the main checkout if Step 7 skipped the
worktree).

**MUST NOT** open a second Cursor window or run `cursor <path>`. Isolation is the
worktree, not a second IDE.

The prompt **MUST** be self-sufficient and **MUST** contain all nine sections from
`best-practices.md` §6.2:

1. Repo path (absolute worktree path)
2. Mission
3. Ownership zone
4. Read-first list (`best-practices.md`, architecture, contracts if needed, the spec,
   agent-log tail, directory README)
5. Contract (types / copy / signatures from the spec)
6. Definition of done
7. Verification commands (`npm run check`, `npm run lint`, `npm run test:unit -- --run`)
8. Constraints: no state-changing git; no `npm install`; zone-only writes; Svelte 5
   runes; no `+server.ts`; Svelte MCP `svelte-autofixer` after every `.svelte` edit
9. Handoff: append `docs/agent-log.md` using `best-practices.md` §6.3

For a **bundle**, orchestrate slices **sequentially** on that same worktree. Fix a red
gate before starting the next slice.

Use the `svelte-file-editor` sub-agent (or equivalent) for `.svelte` work when it is
available.

---

## Step 9 — Verify as you go

After each implementation slice, the implementer **MUST** run the §3.3 gate and fix
failures **in its own zone** before continuing. Pre-existing failures outside the zone
go in the handoff, not in drive-by fixes.

Orchestrator progress reports are **one line**: what shipped, what’s next.

---

## Step 10 — Hand off to `/end-agent`

When the spec’s definition of done is met (or the implementer has returned a complete
handoff with known gaps):

- **MUST NOT** commit, merge, push, or remove the worktree here.
- Print this hand-off line:

  _Implementation complete. Run `/end-agent` when you want to test, clean up, commit,
  merge, push, and remove the worktree._

- Also print a copy-paste command to enter the worktree and start the app. **MUST NOT**
  hardcode a port.

```powershell
Set-Location "C:\Users\JensenM\Documents\My Apps\adt-wt-<zone-name>"
npm run dev
```

If `docs/end-agent.md` is missing, say so in the hand-off so the user can create it
before wrap-up (same rule as this file: do not improvise wrap-up).

---

## Numbering

- Spec numbers are **not** reused. Highest shipped product spec at the time this file
  was added is **28**. The next new slice is **29** unless a numbered stub already
  exists for that exact topic (e.g. spec 10 is ADT Cloud — do not steal that number).
- Letter suffixes (`21a`) are for catalog slices of an existing parent spec, not for
  unrelated features.
- Branch / worktree names: `agent/<kebab-zone>` and `../adt-wt-<kebab-zone>`.

---

## When to stop and ask

- The request is product-ambiguous (not merely multi-module).
- An existing spec covers something close to but not exactly what was asked.
- You are picking up an in-progress branch and resume point is unclear.
- The plan needs a hard-rule exception (dependency, schema, framework, orchestrator
  file).
- Eight to ten files have not produced a confident plan.
- The main tree is dirty with someone else’s work.

---

## Spec template

Use this skeleton. Delete unused headings; do not leave “TBD” in a locked rule.

```markdown
# Spec NN — <Title>

**Status:** Draft (kickoff). Implement only after /new-agent Step 6 approval.
**Worktree:** `git worktree add -b agent/<zone-name> ../adt-wt-<zone-name> main`
**Depends on:** <spec numbers or “nothing”>

## Assumptions

- <explicit, falsifiable>

## Mission

<one paragraph: what to build and why>

## Ownership zone

New:
<paths>

Edit:
<paths>

**MUST NOT** edit: package.json, lockfiles, vite/tsconfig/eslint/prettier/svelte/
playwright config, .gitignore, src/lib/types/**, best-practices.md,
docs/architecture.md, src/routes/+layout.ts, <anything else>

## Locked product rules

1. <rule>
2. <rule>

## Files

<exact files, signatures, copy, algorithms — no “use your judgement”>

## Tests

| Case | Input / action | Expected |
| ---- | -------------- | -------- |
| …    | …              | …        |

Component tests use the `.svelte.test.ts` suffix. No network, no real models, no
unseeded randomness.

## Definition of done

- [ ] Feature, including loading and error states
- [ ] Unit and/or component tests per best-practices §3
- [ ] `npm run check`, `npm run lint`, `npm run test:unit -- --run` green for this zone
- [ ] Directory README + TSDoc current
- [ ] Handoff appended to docs/agent-log.md
- [ ] docs/tasks/README.md index row added
- [ ] No writes outside the ownership zone
```
