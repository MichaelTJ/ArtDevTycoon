# Modifier explorer 2

Fresh prompt series for engine discovery. Sibling of `/modifier-explorer`, with its own
disk gallery under `data/modifier-explorer2/`.

## Series

| Round | Goal                                | Size                                     |
| ----- | ----------------------------------- | ---------------------------------------- |
| 1     | Which objects does the engine know? | 100 subjects × 3 = 300                   |
| 2     | Which style modifiers work?         | 7 modifiers × 10 working objects = 70    |
| 3     | Variety within sketch tiers         | 9 sketch styles × 5 objects each = 45    |
| 4     | Variety within art-medium tiers     | 6 categories × 7 tiers × 5 objects = 210 |
| 5     | Retry failed Round 4 suffixes       | 6 styles × 5 same objects = 30           |
| 6     | Background ladder vs medium skill   | 6 mediums × 7 matched tiers = 42         |
| 7     | Background ladder v2 (studio rig)   | 6 mediums × 7 matched tiers = 42         |

Round 4 categories: Crayons & Construction Paper, Pencil & Sketchbook, Ink & Charcoal,
Acrylic & Digital Tablet, Oil on Canvas, Watercolor Alternatives (gouache / copic / pastel).

Round 5 rewrites the six Round 4 styles Janus failed (construction-paper collage,
architectural graphite, botanical graphite, precise cross-hatch, isometric digital,
finger-painted oil). New phrases keep the same skill rank and the same five objects,
but use medium-texture language instead of geometry/construction tricks.

Round 6 keeps specific locations out of the prompt. Backdrop tier matches skill
tier: white canvas at 1–3, paper/grey studio at 4–5, dramatic bokeh/atmosphere at
6–7. Each cell uses the working Round 4/5 suffix for that medium and rank.

Round 7 repeats the same 42-cell grid with a refined studio progression: flat white
canvas → textured paper → soft drop shadow → neutral gradient → softbox studio →
shallow depth of field → three-point lighting with bokeh.

After Round 1, mark good `subject:*` tags, then edit `WORKING_SUBJECT_KEYS` in
`prompts.ts` so Round 2 uses your winners. Rounds 3–4 rotate five distinct objects per
style/tier from the Round 1 subject list.

## Public surface

Import from `$lib/modifier-explorer2` — same runner/browse/good-tag shape as explorer 1,
with facets (`round`, `subject`, `rarity?`, `style?`, `medium?`, `background?`, `variant`).

## Run

```text
npm run dev
→ open /modifier-explorer2
→ Run Round 1 (Janus) first
→ mark good subjects
→ update WORKING_SUBJECT_KEYS
→ Run Round 2 / 3 / 4 / 5 / 6 / 7
```

Unattended batch (headed **Edge**, WebGPU required; dev server already running).
Uses your normal Edge profile so Janus stays cached — close other Edge windows first
(the profile lock is exclusive):

```text
node src/lib/modifier-explorer2/autorun-round.mjs round7
```

`?autorun=round7` on `/modifier-explorer2` starts the Janus batch after the manifest
loads. Skip-existing is on by default.
