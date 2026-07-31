import type { TileMarker } from './rooms';

export interface WanderState {
	waypointIndex: number;
	/** Tile the NPC is currently moving toward. */
	target: TileMarker;
}

/** Advance to the next patrol index (wrap). */
export function nextWanderTarget(patrol: readonly TileMarker[], currentIndex: number): WanderState {
	if (patrol.length === 0) {
		return { waypointIndex: 0, target: { tx: 0, ty: 0 } };
	}
	const waypointIndex = (currentIndex + 1) % patrol.length;
	return { waypointIndex, target: patrol[waypointIndex]! };
}

/**
 * Pixel step toward target. Returns new position and whether the target tile center
 * was reached (distance ≤ arriveEpsilonPx).
 */
export function stepToward(
	x: number,
	y: number,
	target: TileMarker,
	speedPxPerSec: number,
	dtSec: number,
	tileSize: number,
	arriveEpsilonPx = 2
): { x: number; y: number; arrived: boolean } {
	const targetX = target.tx * tileSize + tileSize / 2;
	const targetY = target.ty * tileSize + tileSize / 2;
	const dx = targetX - x;
	const dy = targetY - y;
	const dist = Math.hypot(dx, dy);
	if (!Number.isFinite(dist) || dist <= arriveEpsilonPx) {
		return { x: targetX, y: targetY, arrived: true };
	}
	const step = speedPxPerSec * dtSec;
	if (step >= dist) {
		return { x: targetX, y: targetY, arrived: true };
	}
	const inv = 1 / dist;
	return {
		x: x + dx * inv * step,
		y: y + dy * inv * step,
		arrived: false
	};
}
