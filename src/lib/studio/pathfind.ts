import type { TileMarker } from './rooms';

export interface PathGrid {
	width: number;
	height: number;
	/** Row-major; 0 = walkable, 1 = blocked. */
	collision: readonly number[];
}

const NEIGHBOURS: readonly { dx: number; dy: number }[] = [
	{ dx: 0, dy: -1 }, // N
	{ dx: 1, dy: 0 }, // E
	{ dx: 0, dy: 1 }, // S
	{ dx: -1, dy: 0 } // W
];

function inBounds(grid: PathGrid, tx: number, ty: number): boolean {
	return tx >= 0 && ty >= 0 && tx < grid.width && ty < grid.height;
}

function isWalkable(grid: PathGrid, tx: number, ty: number): boolean {
	if (!inBounds(grid, tx, ty)) return false;
	return grid.collision[ty * grid.width + tx] === 0;
}

function key(tx: number, ty: number, width: number): number {
	return ty * width + tx;
}

/**
 * Shortest 4-neighbour path from `start` to `goal` on walkable tiles.
 * - Includes both start and goal when a path exists and start !== goal.
 * - If start === goal and start is walkable → `[{ ...start }]`.
 * - If start or goal out of bounds / blocked → `null`.
 * - If no path → `null`.
 * Neighbour order for determinism: N, E, S, W.
 */
export function findPath(grid: PathGrid, start: TileMarker, goal: TileMarker): TileMarker[] | null {
	if (!isWalkable(grid, start.tx, start.ty) || !isWalkable(grid, goal.tx, goal.ty)) {
		return null;
	}
	if (start.tx === goal.tx && start.ty === goal.ty) {
		return [{ tx: start.tx, ty: start.ty }];
	}

	const { width } = grid;
	const startKey = key(start.tx, start.ty, width);
	const goalKey = key(goal.tx, goal.ty, width);
	const parent = new Map<number, number>();
	const visited = new Set<number>([startKey]);
	const queue: number[] = [startKey];

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current === goalKey) break;

		const cx = current % width;
		const cy = (current / width) | 0;

		for (const { dx, dy } of NEIGHBOURS) {
			const nx = cx + dx;
			const ny = cy + dy;
			if (!isWalkable(grid, nx, ny)) continue;
			const nk = key(nx, ny, width);
			if (visited.has(nk)) continue;
			visited.add(nk);
			parent.set(nk, current);
			queue.push(nk);
		}
	}

	if (!parent.has(goalKey) && startKey !== goalKey) {
		return null;
	}

	const path: TileMarker[] = [];
	let cursor: number | undefined = goalKey;
	while (cursor !== undefined) {
		path.push({ tx: cursor % width, ty: (cursor / width) | 0 });
		if (cursor === startKey) break;
		cursor = parent.get(cursor);
	}
	path.reverse();
	return path;
}

/** Convenience: path using a RoomDef-shaped collision buffer. */
export function findPathInRoom(
	width: number,
	height: number,
	collision: readonly number[],
	start: TileMarker,
	goal: TileMarker
): TileMarker[] | null {
	return findPath({ width, height, collision }, start, goal);
}
