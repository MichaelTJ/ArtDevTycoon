# /end-agent — Art Dev Tycoon wrap-up

This is the **wrap-up procedure** for the agent that received `/end-agent`. You are the
**orchestrator**. Execute every step below **in order**. Do not skip, reorder, or merge
steps. Do not improvise a shorter path.

Kickoff (plan, worktree, implementer) is **`/new-agent`**, which follows
`docs/new-agent.md`. This file **MUST NOT** start new product work.

Rules use RFC-2119 language: **MUST**, **MUST NOT**, **SHOULD**, **MAY**. Product and
engineering law still lives in [`best-practices.md`](../best-practices.md) — this file
only sequences how you ship, merge, and **delete the worktree**.

Invoking `/end-agent` is consent to **commit, merge to `main`, push `origin/main`, and
remove worktrees**. Anything outside that (force-push, remote branch deletion, tags,
releases) still needs an explicit ask.

---

## Hard rules (never weaken)

- **MUST NOT** `--force` push to `main` (or `master`).
- **MUST NOT** amend a commit that has already been pushed.
- **MUST NOT** run `git add -A` or `git add .` without reviewing `git status` first.
  Stage named paths only.
- **MUST NOT** skip tests with `.skip` / `.todo` to make a build green.
- **MUST NOT** push if `npm run check`, `npm run lint`, or `npm run test:unit -- --run`
  is failing for owned files. Inherited out-of-zone red goes in the status report;
  do not paper over it, and do not push a merge that makes `main` worse.
- **MUST** inspect the **full** diff (`git diff` / `git diff <base>...HEAD`) before
  committing.
- Commit messages **MUST** use Conventional-Commit prefixes: `feat:`, `fix:`,
  `refactor:`, `docs:`, `chore:`, `test:`, `perf:`.
- Default merge: **fast-forward** (`git merge --ff-only`). If it cannot fast-forward,
  rebase the feature branch onto `main` first, then ff-only. **MUST NOT** `--no-ff`
  unless the user asked for a merge commit.
- **MUST NOT** push while a long-running test/build is happening in another terminal.
- **MUST NOT** bundle dependency bumps into a feature commit — they belong in their own
  `chore:` commit.
- Shared `node_modules` is a Windows **junction**. **MUST** unlink it with
  `cmd /c rmdir` on the reparse point **before** `git worktree remove`. **MUST NOT**
  `Remove-Item -Recurse` a junction, and **MUST NOT** treat `git worktree remove --force`
  as a shortcut — both can delete the **main** install (Vite, `.bin`, etc.).

---

## When to stop and ask

- The working tree contains changes you **did not** write this session (and the user
  did not name them as a wrap-up target).
- You are already on `main` with mixed unrelated dirty files and it is not obvious
  which slice to commit.
- A rebase produces non-trivial conflicts.
- The diff contains a secret, real user data, or a machine-specific path.
- The push is rejected and the cause is not a simple `git fetch` + rebase.
- A leftover worktree has **unique uncommitted work** you were not asked to ship.

---

## Step 1 — Read the contract

Read [`best-practices.md`](../best-practices.md) **end to end**. Do not run git
commands until this step is done.

---

## Step 2 — Inventory what you are wrapping

From the **main checkout**:

`C:\Users\JensenM\Documents\My Apps\Art Dev Tycoon`

Run:

```powershell
git status -sb
git branch --show-current
git worktree list
Get-ChildItem "C:\Users\JensenM\Documents\My Apps" -Directory | Where-Object { $_.Name -like "adt-wt-*" } | Select-Object Name, FullName
```

Classify every `adt-wt-*` folder and every registered worktree as exactly one of:

| Class        | Meaning                                                                | This `/end-agent`                                 |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------- |
| **Ship**     | User named it as ready (or the current finished slice)                 | Commit, merge, push, then **delete the worktree** |
| **Active**   | Another agent is still implementing (e.g. a tutorial still in kickoff) | **MUST NOT** touch                                |
| **Leftover** | Merged, abandoned, empty, or a folder with no unique commits           | **MUST delete** in Step 10                        |
| **Unknown**  | Unique uncommitted work, not named by the user                         | **MUST STOP** and ask                             |

If the user named **several** ready slices, wrap them **one at a time** (Steps 3–9
per slice). **MUST NOT** squash two ownership zones into one commit.

**MUST NOT** wrap an in-progress `/new-agent` (no spec approval, or implementer still
running).

---

## Step 3 — Inspect the full diff

In the slice’s worktree (or the feature branch checkout):

```powershell
git status
git diff
git diff --staged
git log -8 --oneline
git diff main...HEAD
```

Read the **entire** unstaged/staged diff and the branch-vs-`main` diff. Drop debug
scaffolding, `console.log`, commented-out code, and files that do not belong.

**MUST STOP** if you see secrets, credentials, `.env`, real user saves, or a
machine-specific path.

Split unrelated work into separate commits (feature vs `docs:` vs `chore:` lockfile).

---

## Step 4 — Confirm the handoff

Confirm [`docs/agent-log.md`](./agent-log.md) has an entry for this slice
([`best-practices.md`](../best-practices.md) §6.3). If the implementer forgot,
append it **before** the commit.

Confirm `docs/tasks/README.md` index row exists for a new spec.

---

## Step 5 — Test gate

From the slice worktree (junctioned `node_modules` is required; **MUST NOT**
`npm install`):

```powershell
npm run check
npm run lint
npm run test:unit -- --run
```

All three **MUST** be green for owned files. If a command fails in this zone, **stop
and report**. Do not commit, merge, or push.

Inherited failures outside the zone: record them in the final status report. **MUST
NOT** “fix” them with `.skip`. **MUST NOT** push a merge that introduces new red on
`main`.

**MUST NOT** start a second `npm run dev` if one is already running.

---

## Step 6 — Commit on the feature branch

Review `git status`. Stage **named paths** only.

```powershell
git add <path> <path>
git commit -m "$(cat <<'EOF'
feat(zone): why this change exists

EOF
)"
```

On Windows PowerShell, pass the message as a here-string:

```powershell
git commit -m @"
feat(zone): why this change exists
"@
```

The subject is **why**, 1–2 sentences. Prefix from the hard-rules list.

**MUST NOT** commit on `main` unless this slice was approved to work in the main
tree (`best-practices.md` §2.2) **and** `main` is otherwise clean of other agents’
files. Prefer committing on `agent/<zone>` / `feat/<zone>`, then merging.

---

## Step 7 — Merge into `main` (fast-forward)

From the **main checkout**, with a **clean** `main` working tree (stash is not a
cleanup strategy — **MUST STOP** if `main` is dirty with someone else’s work):

```powershell
Set-Location "C:\Users\JensenM\Documents\My Apps\Art Dev Tycoon"
git checkout main
git pull --ff-only origin main
git merge --ff-only agent/<zone-name>
```

If ff-only fails:

```powershell
git checkout agent/<zone-name>
git rebase main
git checkout main
git merge --ff-only agent/<zone-name>
```

Non-trivial rebase conflicts: **stop and report**. Do not invent a resolution for
product files you did not own this slice.

After the merge, re-run the Step 5 gate **on `main`**. If it is red, **stop** — do
not push.

---

## Step 8 — Push

```powershell
git push origin main
```

**MUST NOT** `--force`. **MUST NOT** push the feature branch unless the user asked.
**MUST NOT** delete the remote feature branch unless the user asked.

If rejected because `origin/main` moved: `git fetch` and return to Step 7 (rebase,
ff-only). Any other rejection: **stop and report**.

---

## Step 9 — Remove **this** slice’s worktree

Worktree isolation is temporary. Shipping **MUST** delete it. Do this even if push
was skipped because there is no remote — local merge still counts as shipped.

From the main checkout, **in this order**:

```powershell
# 1. Unlink the junction ONLY (does not delete the main node_modules).
cmd /c rmdir "C:\Users\JensenM\Documents\My Apps\adt-wt-<zone-name>\node_modules"

# 2. Remove the worktree registration and folder.
git worktree remove "C:\Users\JensenM\Documents\My Apps\adt-wt-<zone-name>"

# 3. Drop the local feature branch now that it is in main.
git branch -d agent/<zone-name>
```

If `git worktree remove` refuses because of leftover ignored files (`.svelte-kit`,
Vite cache):

```powershell
cmd /c rmdir "C:\Users\JensenM\Documents\My Apps\adt-wt-<zone-name>\node_modules"
git worktree remove --force "C:\Users\JensenM\Documents\My Apps\adt-wt-<zone-name>"
```

`--force` here means “ignored files in **this** worktree folder”. It is **not**
permission to recurse-delete a junction. The `rmdir` **MUST** already have run.

If the folder remains after `git worktree remove`, delete only that folder (it
**MUST NOT** still contain a `node_modules` junction):

```powershell
cmd /c rmdir /s /q "C:\Users\JensenM\Documents\My Apps\adt-wt-<zone-name>"
```

**MUST NOT** `Remove-Item -Recurse` on a path that might still be a junction to
the main `node_modules`.

If this slice lived on a feature branch **in the main checkout** (no `adt-wt-*`
folder), skip this step’s remove; `git checkout main` after the ff-merge is enough.

---

## Step 10 — Sweep leftover `adt-wt-*` folders

The machine accumulates old worktrees (`adt-wt-domain`, `adt-wt-ui`, gap-review
trees, etc.). After **every** `/end-agent`, **MUST** clean leftovers. This is not
optional.

1. Re-run the inventory commands from Step 2.
2. For each leftover registered worktree or `adt-wt-*` directory that is **not**
   **Active** and **not** a **Ship** slice still in Steps 3–9:

   **Safe to delete** (do all of these):

   - Branch already merged into `main` (`git merge-base --is-ancestor <branch> main`
     exits 0) **and** the worktree has no uncommitted changes.
   - Worktree has **no unique commits** vs `main` and a clean status.
   - Folder exists on disk but is **not** in `git worktree list` (orphan after a
     crashed remove).
   - `git worktree list` shows a missing path (then `git worktree prune`).

   **MUST STOP and ask** if the leftover has uncommitted files or commits not in
   `main`.

3. Delete a leftover the same way as Step 9: `cmd /c rmdir` the `node_modules`
   junction first, then `git worktree remove`, then `git branch -d` if the branch
   is fully merged. Orphan folders: junction `rmdir`, then `cmd /c rmdir /s /q` on
   that folder only.

4. Finish with:

```powershell
git worktree prune
git worktree list
Get-ChildItem "C:\Users\JensenM\Documents\My Apps" -Directory | Where-Object { $_.Name -like "adt-wt-*" }
```

The only remaining `adt-wt-*` folders **MUST** be **Active** agents. The main
checkout is never an `adt-wt-*` folder and **MUST NOT** be deleted.

If several leftovers are all safe, delete them in this same step (still
junction-first per folder). Do not leave “I’ll sweep next time.”

---

## Step 11 — Status report

Print all of:

1. **Shipped** — one line per slice (what, why).
2. **Commits** — hashes on `main`, plus whether `origin/main` was pushed.
3. **Tests** — the three commands and pass/fail (counts if available).
4. **Worktrees removed** — paths deleted this run (this slice **and** leftovers).
5. **Worktrees kept** — Active agents, with path + branch + why kept.
6. **Manual verify** — anything the user should click in-game (do not hardcode a
   port). If a shipped slice still needs a playtest, say so.

Then stop. Do not start the next feature.

---

## Multiple ready slices (this invocation)

When the user says “wrap these N agents”:

1. Complete Steps 3–9 for slice 1 (including **its** worktree removal).
2. Repeat Steps 3–9 for slice 2, then slice 3, …
3. Run Step 10 **once** at the end (leftover sweep).
4. One Step 11 report covering every slice.

Do not merge two slices’ diffs into one commit because they happen to sit in the
same dirty checkout. Split by zone, then ff-only each branch (or sequential
commits on one branch if they already share one feature branch — still one
logical commit per zone).

---

## Junction cheat-sheet (copy-paste)

Replace `<zone-name>`:

```powershell
$wt = "C:\Users\JensenM\Documents\My Apps\adt-wt-<zone-name>"
# Confirm it is a junction/reparse point before rmdir:
cmd /c dir /al "$wt"
cmd /c rmdir "$wt\node_modules"
git worktree remove "$wt"
```

`dir /al` should list `node_modules` as `<JUNCTION>`. If `node_modules` is a real
directory (not a junction), **MUST STOP** — do not `rmdir` it.
