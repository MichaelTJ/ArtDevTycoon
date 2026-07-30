# Spec 10 — ADT Cloud (hosted credits) — STUB

**Status:** Placeholder. A full spec will replace this before implementation.
**Depends on:** Spec 07+; **requires orchestrator** to add backend + `contracts.ts` changes.
**Priority:** Much later. Product/monetization track.

## Mission (draft)

**Art Dev Tycoon Cloud** — inference you operate. Players create accounts, buy credits, and play
without running ComfyUI or local models. Still uses the `remote` picker tier (or a new
`adt-cloud` engine id — orchestrator decision).

Setup is simpler than BYO: login + credit balance, not raw API keys. Backend chooses models; UI
may still show which **generation** and **critique** models are active for transparency, or hide
them behind a single "Cloud AI" tier.

## Breaks current architecture

- Needs a **real server** (auth, billing, inference proxy) — contradicts `adapter-static` / no-backend rule today
- Orchestrator must extend [`contracts.ts`](../../src/lib/types/contracts.ts): auth session, credits, cloud engine availability
- Game calls **your** API, not OpenAI/OpenRouter directly

## Config / UX (draft)

- Login / signup flow (out of Level 1 scope)
- Credit balance in HUD or engine menu
- Insufficient credits → player-safe message, fall back to mock
- Optional: admin picks default generate + critique model pair on server

## Open questions for full spec

- Pricing model (per commission, per image, subscription)
- Whether cloud also serves BAGEL sketch mode (spec 11)
- GDPR / data retention for uploaded prompts and images
- Same dual-model pipeline as 08/09, but models selected server-side

## Definition of done (TBD)

- [ ] Account + credits + at least one paid inference path
- [ ] Generate + critique both run on cloud (two models, one pipeline)
- [ ] Offline / logged-out → mock or local engines only
