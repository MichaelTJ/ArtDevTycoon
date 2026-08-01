# Spec 21a — Living NPCs & residents

**Worktree:** `git worktree add -b agent/living-npcs ../adt-wt-living-npcs main`
**Depends on:** Specs 17–20 merged (Phaser floor, sized venues, resident Mum, HUD/skills).
Does **not** depend on 21b–21f (interactables, audio, VFX, ambient, QoL). Does **not**
depend on 05–11 (AI engines).

## Mission

Specs 17–19 made the kitchen a place and put Mum on the floor. Staff still exist only
as shop cards, door clients all share one untinted look, and Mum is a peach-tinted
reuse of the generic client sheet.

This spec makes the floor feel **hired and inhabited**:

1. **A1 — Mum sheet path** — BootScene loads `mum.png` when present; otherwise keep the
   existing `clients` + tint `0xffc9a8` fallback (already in `StudioScene`).
2. **A2 — Staff on the floor when hired** — Apprentice at a second work spot; Curator
   paces the show/window zone (storefront+); Marketing Director stands near the door.
   `print-shop` is **not** a floor NPC in v1.
3. **A3 — Client look per tier** — Door visitors use a distinct tint/frame mapping for
   `walk-in` / `corporate` / `billionaire` / `auction-house` (exact ids from
   `clientTiers.ts` / `contracts.ts` — there is no `neighbour` id).

Presentation only. Sync staff via additive `StudioSnapshot.hiredRoleIds`. No scoring,
economy, unlock-table, or audio changes.

---

## Ownership zone

```
New:
  src/lib/studio/staffPresence.ts
  src/lib/studio/staffPresence.test.ts
  src/lib/studio/clientLooks.ts
  src/lib/studio/clientLooks.test.ts
  static/studio/characters/mum.png          ← preferred; see §4 (fallback OK if missing)
  static/studio/characters/staff.png        ← optional; see §5
  docs/tasks/21a-living-npcs.md             ← this file (DoD ticks only after impl)

Edit:
  src/lib/studio/bridge.ts                  ← additive snapshot fields §3 only
  src/lib/studio/bridge.test.ts             ← default hiredRoleIds: []
  src/lib/studio/scenes/BootScene.ts        ← load mum (+ optional staff) sheets
  src/lib/studio/scenes/StudioScene.ts      ← Mum sheet path, staff sprites, client looks
  src/lib/studio/README.md                  ← Mum / staff / tier-look notes
  static/studio/CREDITS.md                  ← if new character sheets land
  src/routes/+page.svelte                   ← pass hiredRoleIds + client.tier (minimal)
  src/lib/components/StudioFloor.svelte     ← only if snapshot props / factory need it
  src/lib/components/StudioFloor.svelte.test.ts  ← only if mocks need new snapshot fields
  docs/agent-log.md                         ← handoff
```

**MUST NOT** edit: `package.json`, lockfiles, `src/lib/types/contracts.ts`,
`src/lib/game/**` (scoring, save, skills), `src/lib/data/**` (including
`staffRoles.ts` unlock tables / hire costs), engine files, audio modules (21c),
interactable registry (21b), VFX systems (21d), `docs/architecture.md`,
`docs/tasks/README.md`, `docs/tasks/21-boss-plan.md`, or other `21b`–`21f` specs.

**Reserved snapshot fields (do not add in 21a):** `audioEnabled`, `reducedVfx` — owned
by 21c / 21d. Do not invent alternate names for hired staff.

---

## 1. Shared bridge field (exact name)

```ts
// Additive on StudioSnapshot — default keeps old clients / fixtures compiling
hiredRoleIds: readonly string[];
```

Values are staff role ids from `STAFF_ROLES` in `src/lib/data/staffRoles.ts`:
`apprentice`, `print-shop`, `marketing-director`, `curator`. Phaser filters which of
those become floor sprites (§5). Source of truth in the store is still
`GameStore.hiredStaffIds` — map it into the snapshot field name above.

Do **not** add a `spawn-staff` command. `sync` is enough.

---

## 2. Catalog scope

| #   | Feature                       | v1 status                                          |
| --- | ----------------------------- | -------------------------------------------------- |
| A1  | Dedicated Mum spritesheet     | **MUST** (load path + fallback; asset preferred)   |
| A2  | Staff on the floor when hired | **MUST** (apprentice, curator, marketing-director) |
| A3  | Client look per tier          | **MUST** (tint/frame map for all four tier ids)    |
| A4  | Passing pedestrians           | MAY / follow-up — **out of scope** for v1          |
| A5  | Rival artist cameo            | MAY / follow-up — **out of scope** for v1          |
| A6  | Critic ghost preview          | MAY / follow-up — **out of scope** for v1          |
| A7  | Pet / studio mascot           | MAY / follow-up — **out of scope** for v1          |
| A8  | Crowd at mega-museum          | MAY / follow-up — **out of scope** for v1          |

---

## 3. Bridge — additive snapshot

### 3.1 `StudioSnapshot` changes

```ts
export interface StudioSnapshot {
	// ...existing fields unchanged...
	/**
	 * Hired staff role ids from GameStore.hiredStaffIds (spec 16).
	 * Phaser shows floor NPCs for a subset (§5). Default [].
	 */
	hiredRoleIds: readonly string[];
	/**
	 * Active brief target. `tier` is required when client is non-null so door
	 * visitors can pick a look (A3). Use 'walk-in' when the store brief omits it.
	 */
	client:
		| (Pick<ClientBrief, 'id' | 'clientName' | 'avatarUrl'> & {
				tier: string;
		  })
		| null;
}
```

Every existing fixture that builds a `StudioSnapshot` **MUST** set
`hiredRoleIds: []`. When `client` is non-null, include `tier` (literal default
`'walk-in'` in tests that do not care about looks).

### 3.2 Commands / outbound events

No new command or event types. Keep `summon-client` / `dismiss-client` /
`spawn-visitor` / `sync` semantics from specs 17–19.

### 3.3 `+page.svelte` wiring (minimal)

In `syncStudio()` (or equivalent):

```ts
hiredRoleIds: game.hiredStaffIds,
client: client
	? {
			id: client.id,
			clientName: client.clientName,
			avatarUrl: client.avatarUrl,
			tier: client.tier ?? 'walk-in'
		}
	: null,
```

Do **not** change hire/fire logic in `GameStore`. Do **not** edit `staffRoles.ts`.

---

## 4. A1 — Mum spritesheet load + fallback

### 4.1 BootScene

In `preload()`, **always** register:

```ts
this.load.spritesheet('mum', '/studio/characters/mum.png', {
	frameWidth: 16,
	frameHeight: 16
});
```

Missing file **MUST NOT** crash the game. Use Phaser `loaderror` (or equivalent) so a
404 on `mum.png` is ignored and BootScene still starts `StudioScene`.

Keep existing `clients` / `player` loads unchanged.

### 4.2 StudioScene (already partially present)

Keep the existing path:

1. If `this.textures.exists('mum')` → sprite key `'mum'`, **no** `MUM_TINT`.
2. Else → key `'clients'`, frame from resident def (0), tint `0xffc9a8`.

If `mum.png` ships, update `rooms.ts` resident `spriteKey` to `'mum'` **only if** you
already edit that file for another reason; otherwise StudioScene’s `textures.exists`
check is enough and `spriteKey` on the resident def MAY stay `'clients'`.

### 4.3 Asset preference

**Preferred:** add `static/studio/characters/mum.png` — Tiny Dungeon–scale 16×16 sheet
with at least frame 0 (idle). Walk bob frames matching `clients` (0/1) are ideal.
Credit Kenney / ADT in `CREDITS.md`.

**Acceptable without new pixels:** BootScene load + loaderror + documented fallback in
`src/lib/studio/README.md` and `CREDITS.md` (Mum still tinted). DoD still passes if the
load path is wired and the tint fallback remains.

---

## 5. A2 — Staff on the floor (`staffPresence.ts`)

Pure helpers live in `src/lib/studio/staffPresence.ts`. Phaser movement stays in
`StudioScene`; placement math is unit-tested.

### 5.1 Which roles appear

```ts
/** Floor-visible staff only. print-shop is intentionally omitted. */
export const FLOOR_STAFF_ROLE_IDS = ['apprentice', 'marketing-director', 'curator'] as const;

export type FloorStaffRoleId = (typeof FLOOR_STAFF_ROLE_IDS)[number];

/**
 * Filter + stable order: apprentice → marketing-director → curator.
 * Unknown ids and `print-shop` are dropped.
 */
export function floorStaffFromHired(hiredRoleIds: readonly string[]): FloorStaffRoleId[];
```

| Input `hiredRoleIds`                                            | Expected return                                   |
| --------------------------------------------------------------- | ------------------------------------------------- |
| `[]`                                                            | `[]`                                              |
| `['print-shop']`                                                | `[]`                                              |
| `['curator', 'apprentice']`                                     | `['apprentice', 'curator']`                       |
| `['marketing-director', 'print-shop', 'apprentice', 'curator']` | `['apprentice', 'marketing-director', 'curator']` |
| `['nope', 'apprentice']`                                        | `['apprentice']`                                  |

### 5.2 Anchors (exact rules — no judgement)

```ts
import type { RoomDef, TileMarker } from './rooms';

/** Stand / work tile for a floor staff role in the given room. */
export function staffAnchorForRole(roleId: FloorStaffRoleId, room: RoomDef): TileMarker;

/**
 * Patrol waypoints for the Curator. Length ≥ 2.
 * Uses gallery or window zone when present; else a short east-wall pace.
 */
export function curatorPatrol(room: RoomDef): readonly TileMarker[];
```

**`staffAnchorForRole` algorithms (implement exactly):**

| Role                 | Anchor rule                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apprentice`         | Second work spot: `{ tx: room.desk.tx + 1, ty: room.desk.ty }` if `desk.tx + 1 <= room.width - 2`; else `{ tx: room.desk.tx - 1, ty: room.desk.ty }`. (Prefer +1 so kitchen/garage avoid the solid table/workbench cell west of desk.) |
| `marketing-director` | Near door: use `room.clientWait` (already just inside the entrance).                                                                                                                                                                   |
| `curator`            | First waypoint of `curatorPatrol(room)`.                                                                                                                                                                                               |

**`curatorPatrol` algorithms (implement exactly):**

1. Let `zone = room.zones.find(z => z.id === 'gallery') ?? room.zones.find(z => z.id === 'window')`.
2. If `zone` exists, return four inset corners (clamp each coord so
   `x0+1 ≤ tx ≤ x1-1` and `y0+1 ≤ ty ≤ y1-1`; if inset collapses, use zone min/max as-is):

```ts
[
	{ tx: left, ty: top },
	{ tx: right, ty: top },
	{ tx: right, ty: bottom },
	{ tx: left, ty: bottom }
];
```

where `left = min(zone.x0 + 1, zone.x1)`, `right = max(zone.x1 - 1, zone.x0)`,
`top = min(zone.y0 + 1, zone.y1)`, `bottom = max(zone.y1 - 1, zone.y0)`.

3. If no gallery/window zone (kitchen / garage): return

```ts
[
	{ tx: Math.max(1, room.width - 2), ty: 2 },
	{ tx: Math.max(1, room.width - 2), ty: Math.min(4, room.height - 2) }
];
```

Literal tests (use `getRoomForVenue` / `ROOMS`):

| Call                                                              | Expect                                             |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| `staffAnchorForRole('apprentice', ROOMS['home-kitchen'])`         | `{ tx: 4, ty: 3 }` (desk is `{3,3}` → desk.tx + 1) |
| `staffAnchorForRole('marketing-director', ROOMS['home-kitchen'])` | equals `ROOMS['home-kitchen'].clientWait`          |
| `staffAnchorForRole('apprentice', getRoomForVenue('garage'))`     | `{ tx: 6, ty: 5 }` (garage desk `{5,5}`)           |
| `curatorPatrol(getRoomForVenue('storefront')).length`             | `≥ 2`                                              |
| `curatorPatrol(ROOMS['home-kitchen']).length`                     | `2`                                                |

### 5.3 Staff look (tint / frame)

```ts
export function staffLookForRole(roleId: FloorStaffRoleId): { frame: number; tint: number };
```

| `roleId`             | `frame` | `tint`     |
| -------------------- | ------- | ---------- |
| `apprentice`         | `1`     | `0xa8d4ff` |
| `marketing-director` | `1`     | `0xffd4a8` |
| `curator`            | `0`     | `0xd4c4a8` |

Spritesheet key: `'staff'` if `textures.exists('staff')`, else `'clients'`. Optional
`static/studio/characters/staff.png` may be loaded in BootScene the same way as Mum;
missing file is fine.

### 5.4 StudioScene sync behaviour

On every `sync` (and after venue rebuild):

1. `desired = floorStaffFromHired(snapshot.hiredRoleIds)`.
2. Destroy any staff sprite whose role id is **not** in `desired`.
3. For each id in `desired` missing a sprite: create at `staffAnchorForRole`, apply
   `staffLookForRole`, depth same as Mum/clients (`10`).
4. When `hiredRoleIds` becomes `[]` (or role fired): those sprites **MUST** be gone
   after the sync handler returns (no fade required).
5. **Apprentice:** idle at anchor (play `client-idle` or staff idle if you add one).
   MAY face the desk (`flipX` optional).
6. **Marketing Director:** idle at `clientWait`. Do **not** block door visitor tweens;
   visitor sprite renders as today. MD is flavour presence only — not a talk target.
7. **Curator:** patrol with existing `nextWanderTarget` / `stepToward` at `CLIENT_SPEED`
   (60), pause `200–600ms` at waypoints (same as Mum). Pause patrol only if you need
   to avoid overlapping a talk target; Curator is never the commission talk target.
8. Staff **MUST NOT** emit `talk-to-client` / become interact targets in this spec.
9. On venue rebuild: destroy all staff sprites, then respawn from current
   `hiredRoleIds` for the new room.

Kitchen is small — overlapping sprites are acceptable; do not resize the room.

---

## 6. A3 — Client look per tier (`clientLooks.ts`)

```ts
export interface ClientLook {
	/** Frame index in the `clients` (or future `clients` expanded) sheet. */
	frame: number;
	/** `null` means clearTint / no tint. */
	tint: number | null;
}

/**
 * Map ClientBrief.tier id → presentation. Unknown → walk-in look.
 * Exact ids: walk-in | corporate | billionaire | auction-house
 * (Proposal “neighbour” === walk-in in this codebase.)
 */
export function clientLookForTier(tier: string): ClientLook;
```

| `tier`          | `frame` | `tint`     |
| --------------- | ------- | ---------- |
| `walk-in`       | `0`     | `null`     |
| `corporate`     | `0`     | `0x7a9cc4` |
| `billionaire`   | `0`     | `0xb48cff` |
| `auction-house` | `0`     | `0xc47878` |
| `''` / `'nope'` | `0`     | `null`     |

(If a future expanded `clients.png` adds frames, you MAY switch corporate → frame 1
etc., but the **tint column above is mandatory** for v1 so tiers read apart even with
one character strip.)

### 6.1 Apply in StudioScene

When creating or updating the door-visitor sprite (`#summonClient` / `spawn-visitor` /
sync while `#client` exists):

1. `look = clientLookForTier(snapshot.client?.tier ?? 'walk-in')`.
2. `sprite.setFrame(look.frame)`.
3. If `look.tint === null` → `clearTint()`; else `setTint(look.tint)`.

Mum **MUST NOT** use `clientLookForTier` — she keeps §4 Mum path only.

Re-apply look on `sync` when `#client` exists so a post-invite sync with the real
`tier` updates a visitor that spawned under the idle/`walk-in` default.

---

## 7. BootScene checklist

| Key       | Path                           | Required                    |
| --------- | ------------------------------ | --------------------------- |
| `mum`     | `/studio/characters/mum.png`   | Register load; tolerate 404 |
| `staff`   | `/studio/characters/staff.png` | MAY register; tolerate 404  |
| `clients` | existing                       | unchanged                   |
| `player`  | existing                       | unchanged                   |

---

## 8. Studio README updates

Document under Mum / new “Staff & client looks” bullets:

- `hiredRoleIds` snapshot field and which roles appear on the floor.
- Mum load + tint fallback.
- Tier tint table (or pointer to `clientLooks.ts`).
- Staff are presentation-only (not talk targets).

---

## 9. Definition of done

- [ ] `StudioSnapshot.hiredRoleIds` exists; defaults to `[]` in bridge fixtures/tests.
- [ ] `+page` sync passes `hiredRoleIds: game.hiredStaffIds` and `client.tier`.
- [ ] BootScene registers `mum` spritesheet load; missing file does not break Boot→Studio.
- [ ] Mum uses `'mum'` texture when present; else tinted `clients` `0xffc9a8`.
- [ ] Hiring `apprentice` shows a floor sprite at the second work spot; firing removes it.
- [ ] Hiring `curator` shows a pacing sprite (show/window zone on storefront+).
- [ ] Hiring `marketing-director` shows an idle sprite at `clientWait`.
- [ ] `print-shop` alone never spawns a floor NPC.
- [ ] Door visitors apply `clientLookForTier` for all four tier ids (tint table above).
- [ ] `staffPresence.test.ts` + `clientLooks.test.ts` green with literal tables above.
- [ ] Bridge tests updated for `hiredRoleIds: []`.
- [ ] No new economy / scoring / unlock-table behaviour.
- [ ] `npm run check`, `npm run lint`, and
      `npm run test:unit -- --run src/lib/studio` green for owned files.
- [ ] `src/lib/studio/README.md` + `CREDITS.md` (if assets) + `docs/agent-log.md` handoff.

### Verification commands

```powershell
npm run check
npm run lint
npm run test:unit -- --run src/lib/studio
```

---

## 10. Explicitly out of scope

- A4–A8 (pedestrians, rival cameo, critic ghost, pet, museum crowd).
- Bark / thought bubbles (21e), interact registry / fridge E (21b), audio (21c),
  particles / confetti (21d), pathfinding upgrades (21f).
- Changing hire costs, reputation gates, idle income, or auto-invite multipliers.
- Making staff talk targets or opening shops from staff sprites.
- Editing `contracts.ts` or shop data tables.
- New npm dependencies.
- Snapshot fields `audioEnabled` / `reducedVfx`.

---

## 11. Agent prompt (copy-paste)

> Implement the spec at `docs/tasks/21a-living-npcs.md`.
>
> Worktree (orchestrator creates this before you start):
> `git worktree add -b agent/living-npcs ../adt-wt-living-npcs main`
> Work inside that worktree path when provided.
>
> Read these files completely before writing any code:
>
> 1. `best-practices.md` — the binding rules for this repo
> 2. `docs/architecture.md` — how the system fits together
> 3. `src/lib/types/contracts.ts` — frozen types (do not edit)
> 4. `docs/tasks/21a-living-npcs.md` — your spec
>
> Also read `src/lib/studio/README.md`, `src/lib/studio/bridge.ts`,
> `src/lib/data/staffRoles.ts`, and `docs/agent-log.md` (specs 17 / 19 handoffs).
>
> The spec lists exactly which files to create and which paths you own. Do not create
> or modify any file outside your ownership zone. Do not edit `package.json`,
> `vite.config.ts`, `tsconfig.json`, or `src/lib/types/**`. Do not run `npm install`.
> Do not run any state-changing git command — no commit, add, checkout, merge, or push.
>
> Do not implement 21b–21f features. Do not add `audioEnabled` or `reducedVfx`.
> Use the exact snapshot field name `hiredRoleIds`.
>
> Confirm specs 17–20 are present on the branch (`npcWander.ts`, `venueRooms.ts`,
> skills / HUD from spec 20). If they are missing, stop and report — do not invent them.
>
> Implement every required file in the spec, including its tests. Then run:
>
> ```
> npm run check
> npm run lint
> npm run test:unit -- --run src/lib/studio
> ```
>
> Finally, update `src/lib/studio/README.md` (and `CREDITS.md` if you add sheets) and
> append your handoff entry to `docs/agent-log.md` using the template in
> `best-practices.md` §6.3.
