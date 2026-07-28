# Art Gallery Tycoon

A browser management sim about running a struggling art studio. Clients arrive with a
brief, you write a prompt, and an AI generates the artwork — except in Level 1 the game
quietly staples `crayon texture, amateur style, low detail` onto everything you write.
An AI critic then looks at what you actually produced and decides how much you get paid.

Five commissions and $500 gets you out of the garage.

## Status

The foundation and the full set of implementation specs are complete. The five feature
workstreams are specified and ready to build — see `docs/tasks/README.md`.

## Quick start

```powershell
npm install
npm run dev
```

The game runs on a deterministic **mock** AI provider by default, so it is playable and
fully testable with no models installed and no GPU. Real generation is opt-in.

## Commands

| Command                      | Purpose                        |
| ---------------------------- | ------------------------------ |
| `npm run dev`                | Dev server on port 5173        |
| `npm run check`              | Type-check `.ts` and `.svelte` |
| `npm run lint`               | Prettier check plus ESLint     |
| `npm run format`             | Apply Prettier                 |
| `npm run test:unit -- --run` | Unit and component tests       |
| `npm run test:e2e`           | Playwright end-to-end tests    |

Unit tests run in Node; component tests (`*.svelte.test.ts`) run in real Chromium. The
first browser run takes 40–70 seconds while Vitest starts the browser — that is normal.

## Tech

SvelteKit 2.63 · Svelte 5.56 (runes, forced on) · TypeScript 6 · Tailwind 4 · Vite 8 ·
Vitest 4 · Playwright · Zod.

Optional local AI, via a Python sidecar: **SDXL-Turbo** for generation and
**Janus-Pro-1B** for critique, both on the Intel Arc iGPU through OpenVINO.

## Enabling real AI

```powershell
cd sidecar
.\scripts\setup.ps1              # creates a Python 3.12 venv, installs the ML stack
python scripts\export_models.py --image --critic   # ~7 GB download, opt-in
python -m uvicorn app.main:app --port 8756
```

Then set `AI_PROVIDER=sidecar` in `.env` (copy from `.env.example`). Use `auto` to try
the sidecar and fall back to the mock if it is not running.

## Documentation

| File                         | Contents                                                    |
| ---------------------------- | ----------------------------------------------------------- |
| `best-practices.md`          | Binding rules: ownership zones, git protocol, testing, docs |
| `docs/architecture.md`       | System design and the reasoning behind it                   |
| `docs/tasks/README.md`       | The five build specs, their order and how to run them       |
| `docs/agent-log.md`          | Append-only record of what each agent built                 |
| `src/lib/types/contracts.ts` | The frozen contract shared by every layer                   |

Multiple agents build this repo in parallel using git worktrees with disjoint file
ownership. `best-practices.md` §2 explains the isolation model; read it before starting
any work.
