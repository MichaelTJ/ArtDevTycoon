import { describe, expect, it } from 'vitest';
import { nextWanderTarget, stepToward, tileFromPixel, withPath } from './npcWander';

describe('npcWander', () => {
	it('nextWanderTarget advances and wraps', () => {
		const patrol = [
			{ tx: 0, ty: 0 },
			{ tx: 1, ty: 0 }
		];
		expect(nextWanderTarget(patrol, 0).waypointIndex).toBe(1);
		expect(nextWanderTarget(patrol, 1).waypointIndex).toBe(0);
		expect(nextWanderTarget(patrol, 0).target).toEqual({ tx: 1, ty: 0 });
		expect(nextWanderTarget(patrol, 0).path).toEqual([]);
	});

	it('tileFromPixel floors into tile coords', () => {
		expect(tileFromPixel(8, 24, 16)).toEqual({ tx: 0, ty: 1 });
	});

	it('withPath skips start tile for multi-step paths', () => {
		const base = nextWanderTarget(
			[
				{ tx: 0, ty: 0 },
				{ tx: 2, ty: 0 }
			],
			0
		);
		const path = [
			{ tx: 0, ty: 0 },
			{ tx: 1, ty: 0 },
			{ tx: 2, ty: 0 }
		];
		const bound = withPath(base, path);
		expect(bound.pathIndex).toBe(1);
		expect(bound.path[bound.pathIndex]).toEqual({ tx: 1, ty: 0 });
		expect(withPath(base, [{ tx: 2, ty: 0 }]).pathIndex).toBe(1);
	});

	it('stepToward reaches tile center and never returns NaN', () => {
		// Tile 0 center is (8,8) at tileSize 16; tile (1,0) center is (24,8).
		let x = 8;
		let y = 8;
		let arrived = false;
		for (let i = 0; i < 20 && !arrived; i++) {
			const step = stepToward(x, y, { tx: 1, ty: 0 }, 80, 1, 16);
			x = step.x;
			y = step.y;
			arrived = step.arrived;
			expect(Number.isNaN(x)).toBe(false);
			expect(Number.isNaN(y)).toBe(false);
		}
		expect(arrived).toBe(true);
		expect(x).toBe(24);
		expect(y).toBe(8);
	});
});
