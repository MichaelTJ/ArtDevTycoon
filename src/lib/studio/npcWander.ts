import type { TileMarker } from './rooms';

export interface WanderState {
	waypointIndex: number;
	/** Patrol waypoint tile (far goal); pathfollow steps tile-by-tile toward it. */
	target: TileMarker;
	/** Remaining BFS path including start; empty when not yet computed. */
	path: TileMarker[];
	/** Index into `path` of the tile currently being stepped toward. */
	pathIndex: number;
}

/** Advance to the next patrol index (wrap). Clears path so the scene repaths. */
export function nextWanderTarget(patrol: readonly TileMarker[], currentIndex: number): WanderState {
	if (patrol.length === 0) {
		return { waypointIndex: 0, target: { tx: 0, ty: 0 }, path: [], pathIndex: 0 };
	}
	const waypointIndex = (currentIndex + 1) % patrol.length;
	return { waypointIndex, target: patrol[waypointIndex]!, path: [], pathIndex: 0 };
}

/** Pixel position → containing tile. */
export function tileFromPixel(x: number, y: number, tileSize: number): TileMarker {
	return { tx: Math.floor(x / tileSize), ty: Math.floor(y / tileSize) };
}

/**
 * Bind a BFS path onto wander state. Skips the start tile so the first step
 * targets path[1] when length > 1. Single-tile paths are treated as already arrived
 * (`pathIndex >= path.length`).
 */
export function withPath(wander: WanderState, path: TileMarker[]): WanderState {
	if (path.length <= 1) {
		return { ...wander, path, pathIndex: path.length };
	}
	return { ...wander, path, pathIndex: 1 };
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
