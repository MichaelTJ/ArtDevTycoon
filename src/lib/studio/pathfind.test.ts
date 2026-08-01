import { describe, expect, it } from 'vitest';
import { findPath, findPathInRoom } from './pathfind';
import { ROOMS } from './rooms';
import { getRoomForVenue } from './venueRooms';

function kitchenGrid() {
	const room = getRoomForVenue('fridge');
	expect(room.id).toBe('home-kitchen');
	expect(room).toBe(ROOMS['home-kitchen']);
	return {
		width: room.width,
		height: room.height,
		collision: room.collision
	};
}

describe('findPath / findPathInRoom', () => {
	it('example A: (4,2) → (1,2) along row ty=2', () => {
		const grid = kitchenGrid();
		const path = findPath(grid, { tx: 4, ty: 2 }, { tx: 1, ty: 2 });
		expect(path).toEqual([
			{ tx: 4, ty: 2 },
			{ tx: 3, ty: 2 },
			{ tx: 2, ty: 2 },
			{ tx: 1, ty: 2 }
		]);
	});

	it('example B: (1,2) → (3,1) length 4, never fridge/table', () => {
		const grid = kitchenGrid();
		const path = findPath(grid, { tx: 1, ty: 2 }, { tx: 3, ty: 1 });
		expect(path).not.toBeNull();
		expect(path!.length).toBe(4);
		for (const cell of path!) {
			expect(grid.collision[cell.ty * grid.width + cell.tx]).toBe(0);
			expect(cell).not.toEqual({ tx: 1, ty: 1 });
			expect(cell).not.toEqual({ tx: 2, ty: 3 });
		}
	});

	it('example C: blocked goal (table) → null', () => {
		const grid = kitchenGrid();
		expect(findPath(grid, { tx: 4, ty: 2 }, { tx: 2, ty: 3 })).toBeNull();
	});

	it('example D: start === goal → single-tile path', () => {
		const grid = kitchenGrid();
		expect(findPath(grid, { tx: 4, ty: 4 }, { tx: 4, ty: 4 })).toEqual([{ tx: 4, ty: 4 }]);
	});

	it('start on wall → null', () => {
		const grid = kitchenGrid();
		expect(findPath(grid, { tx: 0, ty: 0 }, { tx: 4, ty: 2 })).toBeNull();
	});

	it('mega-museum-sized empty open rect 28×16 corners is Manhattan length', () => {
		const width = 28;
		const height = 16;
		const collision = new Array(width * height).fill(0);
		const path = findPathInRoom(
			width,
			height,
			collision,
			{ tx: 0, ty: 0 },
			{
				tx: width - 1,
				ty: height - 1
			}
		);
		expect(path).not.toBeNull();
		expect(path!.length).toBe(width + height - 1);
	});

	it('open 3×3 corner → opposite length 5', () => {
		const width = 3;
		const height = 3;
		const collision = new Array(9).fill(0);
		const path = findPathInRoom(width, height, collision, { tx: 0, ty: 0 }, { tx: 2, ty: 2 });
		expect(path).not.toBeNull();
		expect(path!.length).toBe(5);
	});

	it('findPathInRoom matches findPath on kitchen', () => {
		const room = getRoomForVenue('fridge');
		const a = findPath(
			{ width: room.width, height: room.height, collision: room.collision },
			{ tx: 4, ty: 2 },
			{ tx: 1, ty: 2 }
		);
		const b = findPathInRoom(
			room.width,
			room.height,
			room.collision,
			{ tx: 4, ty: 2 },
			{ tx: 1, ty: 2 }
		);
		expect(b).toEqual(a);
	});
});
