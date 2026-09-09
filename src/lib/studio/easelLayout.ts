import {
	markersEqual,
	markerWalkable,
	roomDesks,
	roomFridgeAnchors,
	type RoomDef,
	type TileMarker
} from './rooms';

export interface EaselSlot {
	tx: number;
	ty: number;
	/** 'magnet' = fridge style; 'easel' = freestanding for bigger venues. */
	kind: 'magnet' | 'easel';
}

/** Kenney furniture.png block used for freestanding easels. */
export const EASEL_STAND_FRAME = 4;

function furnitureAt(room: RoomDef, tx: number, ty: number): boolean {
	return room.furniture.some((prop) => prop.tx === tx && prop.ty === ty);
}

/**
 * Furniture.png frame for a freestanding easel, or `null` to keep the room tile
 * (fridge cabinets, painted fridge sprites, counters). Magnets never spawn a
 * stand — they hang on the existing sprite.
 */
export function easelStandFrame(slot: EaselSlot, room: RoomDef): number | null {
	if (slot.kind === 'magnet') return null;
	if (furnitureAt(room, slot.tx, slot.ty)) return null;
	if (roomFridgeAnchors(room).some((marker) => markersEqual(marker, slot))) return null;
	return EASEL_STAND_FRAME;
}

const VENUE_SLOT_COUNTS: Record<string, number> = {
	fridge: 3,
	garage: 6,
	storefront: 8,
	'gallery-hall': 10,
	'mega-museum': 12
};

function isDeskCell(room: RoomDef, tx: number, ty: number): boolean {
	return roomDesks(room).some((desk) => desk.tx === tx && desk.ty === ty);
}

function scanZoneSlots(
	room: RoomDef,
	zoneBounds: {
		x0: number;
		y0: number;
		x1: number;
		y1: number;
	},
	count: number,
	occupied: readonly TileMarker[]
): TileMarker[] {
	const found: TileMarker[] = [];
	for (let ty = zoneBounds.y0; ty <= zoneBounds.y1 && found.length < count; ty++) {
		for (let tx = zoneBounds.x0; tx <= zoneBounds.x1 && found.length < count; tx++) {
			const marker = { tx, ty };
			if (!markerWalkable(room, marker)) continue;
			if (isDeskCell(room, tx, ty)) continue;
			if (occupied.some((slot) => markersEqual(slot, marker))) continue;
			found.push(marker);
		}
	}
	return found;
}

/**
 * Fridge / unknown → magnets. Garage → 3 magnets + easels (spec 19 kitchen-scale mix).
 * Storefront and above → freestanding easels only (spec 17 §6.5).
 */
function magnetCountForVenue(venueId: string, slotCount: number): number {
	if (!(venueId in VENUE_SLOT_COUNTS) || venueId === 'fridge') {
		return slotCount;
	}
	if (venueId === 'garage') {
		return Math.min(3, slotCount);
	}
	return 0;
}

/**
 * How many on-floor display slots for a venue id (capped below mega capacity so the
 * HUD strip remains the full list).
 */
export function slotsForVenue(venueId: string, room: RoomDef): EaselSlot[] {
	const count = VENUE_SLOT_COUNTS[venueId] ?? VENUE_SLOT_COUNTS.fridge;
	const slots: EaselSlot[] = [];
	const magnetCount = magnetCountForVenue(venueId, count);
	const fridgeOrigins = roomFridgeAnchors(room);

	const fridgeKind: EaselSlot['kind'] = magnetCount > 0 ? 'magnet' : 'easel';
	for (const origin of fridgeOrigins) {
		if (slots.length >= count) break;
		if (slots.some((slot) => markersEqual(slot, origin))) continue;
		if (isDeskCell(room, origin.tx, origin.ty)) continue;
		slots.push({ tx: origin.tx, ty: origin.ty, kind: fridgeKind });
	}

	const neighborOffsets = [
		{ tx: 0, ty: 1 },
		{ tx: 1, ty: 0 },
		{ tx: -1, ty: 0 },
		{ tx: 0, ty: -1 }
	] as const;
	let neighborIndex = 0;
	while (
		slots.filter((slot) => slot.kind === 'magnet').length < magnetCount &&
		slots.length < count
	) {
		const origin = fridgeOrigins[neighborIndex % fridgeOrigins.length] ?? room.fridgeAnchor;
		const offset = neighborOffsets[neighborIndex % neighborOffsets.length]!;
		neighborIndex += 1;
		if (neighborIndex > magnetCount * 8) break;
		const marker = { tx: origin.tx + offset.tx, ty: origin.ty + offset.ty };
		if (isDeskCell(room, marker.tx, marker.ty)) continue;
		if (slots.some((slot) => markersEqual(slot, marker))) continue;
		slots.push({ tx: marker.tx, ty: marker.ty, kind: 'magnet' });
	}

	if (slots.length >= count) return finalizeSlots(slots, room);

	const easelCount = count - slots.length;
	const showZone = room.zones.find((z) => z.id === 'gallery' || z.id === 'window');
	let easelMarkers: TileMarker[] = [];

	if (showZone) {
		easelMarkers = scanZoneSlots(room, showZone, easelCount, slots);
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
			if (slots.some((slot) => markersEqual(slot, marker))) continue;
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
		if (slots.some((slot) => markersEqual(slot, marker))) continue;
		if (isDeskCell(room, marker.tx, marker.ty)) continue;
		slots.push({ tx: marker.tx, ty: marker.ty, kind: 'easel' });
	}

	return finalizeSlots(slots, room);
}

function finalizeSlots(slots: EaselSlot[], room: RoomDef): EaselSlot[] {
	return slots.map((slot) => {
		let tx = Math.max(0, Math.min(slot.tx, room.width - 1));
		const ty = Math.max(0, Math.min(slot.ty, room.height - 1));
		if (isDeskCell(room, tx, ty)) {
			tx = Math.max(0, Math.min(tx + 1, room.width - 1));
		}
		return { ...slot, tx, ty };
	});
}
