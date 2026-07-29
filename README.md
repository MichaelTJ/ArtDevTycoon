# Art Gallery Tycoon

A browser management sim about running a struggling art studio. Clients arrive with a
brief, you write a prompt, and an AI generates the artwork — except in Level 1 the game
quietly staples `crayon texture, amateur style, low detail` onto everything you write.
An AI critic then looks at what you actually produced and decides how much you get paid.

Five commissions and $500 gets you out of the garage.

**It runs entirely in your browser.** There is no server, no account and no API key.
The AI models download once, on request, and run on your device with WebGPU — so the
game works offline afterwards and nothing you write leaves your machine.

## Status

The foundation and the full set of implementation specs are complete. The six feature
workstreams are specified and ready to build — see `docs/tasks/README.md`.

## Quick start

```powershell
npm install
npm run dev
```

The game starts on a deterministic **mock** engine: procedural art and real scoring,
with nothing to download and no GPU required. It is fully playable that way, which
matters because WebGPU is not available to every mobile player. Real AI is opt-in from
the engine menu.

## AI engines

| Engine       | Download      | Needs           | Notes                                                 |
| ------------ | ------------- | --------------- | ----------------------------------------------------- |
| Crayon Mode  | none          | nothing         | Procedural art. Always available, always the default. |
| Janus Pro 1B | ~1 GB         | WebGPU          | One model generates _and_ critiques, at 384×384.      |
| SD-Turbo HD  | ~1.5 GB extra | WebGPU, desktop | Sharper 512×512 art; Janus still critiques.           |

Nothing downloads until you explicitly ask for it.

## Commands

| Command                      | Purpose                        |
| ---------------------------- | ------------------------------ |
| `npm run dev`                | Dev server on port 5173        |
| `npm run check`              | Type-check `.ts` and `.svelte` |
| `npm run lint`               | Prettier check plus ESLint     |
| `npm run format`             | Apply Prettier                 |
| `npm run test:unit -- --run` | Unit and component tests       |
| `npm run test:e2e`           | Playwright end-to-end tests    |
| `npm run build`              | Static bundle into `build/`    |

Unit tests run in Node; component tests (`*.svelte.test.ts`) run in real Chromium. The
first browser run takes 40–70 seconds while Vitest starts the browser — that is normal.

## Deploying

`npm run build` emits plain static files to `build/`. Drop them on any static host —
Cloudflare Pages, Netlify, GitHub Pages, an S3 bucket. There is nothing to run
server-side.

## Tech

SvelteKit 2.63 (`adapter-static`) · Svelte 5.56 (runes, forced on) · TypeScript 6 ·
Tailwind 4 · Vite 8 · Vitest 4 · Playwright · Zod.

In-browser inference: **Transformers.js** on WebGPU for Janus-Pro-1B, **ONNX Runtime
Web** for SD-Turbo. All inference runs in a Web Worker.

> `npm audit` reports high-severity advisories against `onnxruntime-node` and `sharp`.
> Those are Node-only dependencies of Transformers.js and never reach the browser
> bundle. See `docs/architecture.md` §8.

## Documentation

| File                         | Contents                                                    |
| ---------------------------- | ----------------------------------------------------------- |
| `best-practices.md`          | Binding rules: ownership zones, git protocol, testing, docs |
| `docs/architecture.md`       | System design and the reasoning behind it                   |
| `docs/tasks/README.md`       | The six build specs, their order and how to run them        |
| `docs/agent-log.md`          | Append-only record of what each agent built                 |
| `src/lib/types/contracts.ts` | The frozen contract shared by every layer                   |

Multiple agents build this repo in parallel using git worktrees with disjoint file
ownership. `best-practices.md` §2 explains the isolation model; read it before starting
any work.
