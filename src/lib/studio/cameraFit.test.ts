import { describe, expect, it } from 'vitest';
import {
	CAMERA_ZOOM_MAX,
	cameraZoomToFitRoom,
	studioViewportSize,
	STUDIO_VIEWPORT_DEFAULT_HEIGHT,
	STUDIO_VIEWPORT_DEFAULT_WIDTH
} from './cameraFit';
import { TILE_SIZE } from './config';

describe('cameraZoomToFitRoom', () => {
	const kitchenPx = 6 * TILE_SIZE;

	it('caps zoom at 1 for small rooms (kitchen letterbox)', () => {
		const zoom = cameraZoomToFitRoom(kitchenPx, kitchenPx, 640, 420);
		expect(zoom).toBe(CAMERA_ZOOM_MAX);
	});

	it('shows the full 6×6 kitchen at zoom 1', () => {
		const zoom = cameraZoomToFitRoom(kitchenPx, kitchenPx, 640, 420, TILE_SIZE);
		expect(zoom).toBe(1);
		// Visible world at zoom 1 exceeds room — whole floor fits with margins.
		expect(640 / zoom).toBeGreaterThanOrEqual(kitchenPx);
		expect(420 / zoom).toBeGreaterThanOrEqual(kitchenPx);
	});

	it('zooms out when the room is larger than the viewport', () => {
		const roomW = 40 * TILE_SIZE;
		const roomH = 30 * TILE_SIZE;
		const zoom = cameraZoomToFitRoom(roomW, roomH, 640, 420);
		expect(zoom).toBeLessThan(CAMERA_ZOOM_MAX);
		expect(zoom).toBeCloseTo(Math.min(640 / roomW, 420 / roomH), 5);
	});

	it('fits medium rooms at 1:1 when they already fit', () => {
		const roomW = 12 * TILE_SIZE;
		const roomH = 10 * TILE_SIZE;
		const zoom = cameraZoomToFitRoom(roomW, roomH, 640, 420);
		expect(zoom).toBe(CAMERA_ZOOM_MAX);
	});

	it('respects padding', () => {
		const zoomNoPad = cameraZoomToFitRoom(kitchenPx, kitchenPx, 100, 100);
		const zoomPad = cameraZoomToFitRoom(kitchenPx, kitchenPx, 100, 100, 8);
		expect(zoomPad).toBeLessThanOrEqual(zoomNoPad);
	});

	it('returns max zoom for invalid dimensions', () => {
		expect(cameraZoomToFitRoom(0, 96, 640, 420)).toBe(CAMERA_ZOOM_MAX);
		expect(cameraZoomToFitRoom(96, 96, 0, 420)).toBe(CAMERA_ZOOM_MAX);
	});
});

describe('studioViewportSize', () => {
	it('uses parent client dimensions when available', () => {
		const parent = { clientWidth: 512, clientHeight: 384 } as HTMLElement;
		expect(studioViewportSize(parent)).toEqual({ width: 512, height: 384 });
	});

	it('falls back when parent is not laid out', () => {
		const parent = { clientWidth: 0, clientHeight: 0 } as HTMLElement;
		expect(studioViewportSize(parent)).toEqual({
			width: STUDIO_VIEWPORT_DEFAULT_WIDTH,
			height: STUDIO_VIEWPORT_DEFAULT_HEIGHT
		});
	});
});
