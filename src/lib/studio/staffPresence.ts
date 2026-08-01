import type { RoomDef, TileMarker } from './rooms';

/** Floor-visible staff only. print-shop is intentionally omitted. */
export const FLOOR_STAFF_ROLE_IDS = ['apprentice', 'marketing-director', 'curator'] as const;

export type FloorStaffRoleId = (typeof FLOOR_STAFF_ROLE_IDS)[number];

/**
 * Filter + stable order: apprentice → marketing-director → curator.
 * Unknown ids and `print-shop` are dropped.
 */
export function floorStaffFromHired(hiredRoleIds: readonly string[]): FloorStaffRoleId[] {
	const hired = new Set(hiredRoleIds);
	return FLOOR_STAFF_ROLE_IDS.filter((id) => hired.has(id));
}

/**
 * Patrol waypoints for the Curator. Length ≥ 2.
 * Uses gallery or window zone when present; else a short east-wall pace.
 */
export function curatorPatrol(room: RoomDef): readonly TileMarker[] {
	const zone =
		room.zones.find((z) => z.id === 'gallery') ?? room.zones.find((z) => z.id === 'window');
	if (zone) {
		const left = Math.min(zone.x0 + 1, zone.x1);
		const right = Math.max(zone.x1 - 1, zone.x0);
		const top = Math.min(zone.y0 + 1, zone.y1);
		const bottom = Math.max(zone.y1 - 1, zone.y0);
		return [
			{ tx: left, ty: top },
			{ tx: right, ty: top },
			{ tx: right, ty: bottom },
			{ tx: left, ty: bottom }
		];
	}
	return [
		{ tx: Math.max(1, room.width - 2), ty: 2 },
		{ tx: Math.max(1, room.width - 2), ty: Math.min(4, room.height - 2) }
	];
}

/** Stand / work tile for a floor staff role in the given room. */
export function staffAnchorForRole(roleId: FloorStaffRoleId, room: RoomDef): TileMarker {
	if (roleId === 'apprentice') {
		if (room.desk.tx + 1 <= room.width - 2) {
			return { tx: room.desk.tx + 1, ty: room.desk.ty };
		}
		return { tx: room.desk.tx - 1, ty: room.desk.ty };
	}
	if (roleId === 'marketing-director') {
		return room.clientWait;
	}
	return curatorPatrol(room)[0]!;
}

/** Tint / frame so each floor role reads apart on the shared clients/staff sheet. */
export function staffLookForRole(roleId: FloorStaffRoleId): { frame: number; tint: number } {
	switch (roleId) {
		case 'apprentice':
			return { frame: 1, tint: 0xa8d4ff };
		case 'marketing-director':
			return { frame: 1, tint: 0xffd4a8 };
		case 'curator':
			return { frame: 0, tint: 0xd4c4a8 };
	}
}
