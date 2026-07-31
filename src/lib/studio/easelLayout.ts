import { markerWalkable, type RoomDef, type TileMarker } from './rooms';

export interface EaselSlot {
	tx: number;
	ty: number;
	/** 'magnet' = fridge style; 'easel' = freestanding for bigger venues. */
	kind: 'magnet' | 'easel';
}

const VENUE_SLOT_COUNTS: Record<string, number> = {
	fridge: 3,
	garage: 6,
	storefront: 8,
	'gallery-hall': 10,
	'mega-museum': 12
};

function isDeskCell(room: RoomDef, tx: number, ty: number): boolean {
	return tx === room.desk.tx && ty === room.desk.ty;
}

function scanZoneSlots(
	room: RoomDef,
	zoneBounds: {
		x0: number;
		y0: number;
		x1: number;
		y1: number;
	},
	count: number
): TileMarker[] {
	const found: TileMarker[] = [];
	for (let ty = zoneBounds.y0; ty <= zoneBounds.y1 && found.length < count; ty++) {
		for (let tx = zoneBounds.x0; tx <= zoneBounds.x1 && found.length < count; tx++) {
			const marker = { tx, ty };
			if (!markerWalkable(room, marker)) continue;
			if (isDeskCell(room, tx, ty)) continue;
			found.push(marker);
		}
	}
	return found;
}

/**
 * How many on-floor display slots for a venue id (capped below mega capacity so the
 * HUD strip remains the full list).
 */
export function slotsForVenue(venueId: string, room: RoomDef): EaselSlot[] {
	const count = VENUE_SLOT_COUNTS[venueId] ?? VENUE_SLOT_COUNTS.fridge;
	const slots: EaselSlot[] = [];

	// First three: magnets around the fridge wall.
	const magnetOrigins = [
		{ tx: room.fridgeAnchor.tx, ty: room.fridgeAnchor.ty },
		{ tx: room.fridgeAnchor.tx, ty: room.fridgeAnchor.ty + 1 },
		{ tx: room.fridgeAnchor.tx + 1, ty: room.fridgeAnchor.ty }
	];
	for (let i = 0; i < Math.min(3, count); i++) {
		const origin = magnetOrigins[i] ?? magnetOrigins[0]!;
		slots.push({ tx: origin.tx, ty: origin.ty, kind: 'magnet' });
	}

	if (count <= 3) return finalizeSlots(slots, room);

	const easelCount = count - 3;
	const showZone = room.zones.find((z) => z.id === 'gallery' || z.id === 'window');
	let easelMarkers: TileMarker[] = [];

	if (showZone) {
		easelMarkers = scanZoneSlots(room, showZone, easelCount);
	}

	if (easelMarkers.length < easelCount) {
		const eastTx = room.width - 2;
		let i = 0;
		while (easelMarkers.length < easelCount && i < room.height) {
			const ty = 2 + i;
			i += 1;
			if (ty >= room.height - 1) break;
			const marker = { tx: eastTx, ty };
			if (!markerWalkable(room, marker) && ty >= room.height - 1) break;
			if (ty < 1 || ty >= room.height - 1) continue;
			if (isDeskCell(room, marker.tx, marker.ty)) continue;
			if (easelMarkers.some((m) => m.tx === marker.tx && m.ty === marker.ty)) continue;
			// Prefer walkable; fall back to clamped east wall for sparse rooms.
			if (markerWalkable(room, marker) || marker.tx < room.width) {
				easelMarkers.push(marker);
			}
		}
	}

	for (let i = 0; i < easelCount; i++) {
		const marker = easelMarkers[i] ?? {
			tx: Math.min(room.width - 2, Math.max(1, room.width - 2)),
			ty: Math.min(room.height - 2, Math.max(1, 2 + i))
		};
		slots.push({ tx: marker.tx, ty: marker.ty, kind: 'easel' });
	}

	return finalizeSlots(slots, room);
}

function finalizeSlots(slots: EaselSlot[], room: RoomDef): EaselSlot[] {
	return slots.map((slot) => {
		let tx = Math.max(0, Math.min(slot.tx, room.width - 1));
		let ty = Math.max(0, Math.min(slot.ty, room.height - 1));
		if (tx === room.desk.tx && ty === room.desk.ty) {
			tx = Math.max(0, Math.min(tx + 1, room.width - 1));
		}
		return { ...slot, tx, ty };
	});
}
