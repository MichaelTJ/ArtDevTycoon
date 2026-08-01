import { describe, expect, it } from 'vitest';
import {
	CAMERA_ZOOM_MAX,
	cameraLetterboxBounds,
	cameraRoomCenter,
	cameraZoomToFitRoom,
	studioViewportSize,
	STUDIO_VIEWPORT_DEFAULT_HEIGHT,
	STUDIO_VIEWPORT_DEFAULT_WIDTH
} from './cameraFit';
import { TILE_SIZE } from './config';

describe('cameraZoomToFitRoom', () => {
	const kitchenPx = 6 * TILE_SIZE;

	it('magnifies small rooms up to 4× (kitchen)', () => {
		const zoom = cameraZoomToFitRoom(kitchenPx, kitchenPx, 640, 420);
		expect(zoom).toBe(CAMERA_ZOOM_MAX);
	});

	it('shows the full 6×6 kitchen at max zoom with padding', () => {
		const zoom = cameraZoomToFitRoom(kitchenPx, kitchenPx, 640, 420, TILE_SIZE);
		expect(zoom).toBe(CAMERA_ZOOM_MAX);
		const viewW = 640 / zoom;
		const viewH = 420 / zoom;
		expect(viewW).toBeGreaterThanOrEqual(kitchenPx);
		expect(viewH).toBeGreaterThanOrEqual(kitchenPx);
	});

	it('zooms out when the room is larger than the viewport', () => {
		const roomW = 40 * TILE_SIZE;
		const roomH = 30 * TILE_SIZE;
		const zoom = cameraZoomToFitRoom(roomW, roomH, 640, 420);
		expect(zoom).toBeLessThan(CAMERA_ZOOM_MAX);
		expect(zoom).toBeCloseTo(Math.min(640 / roomW, 420 / roomH), 5);
	});

	it('uses fit zoom below max when a medium room already fits without magnifying', () => {
		const roomW = 12 * TILE_SIZE;
		const roomH = 10 * TILE_SIZE;
		const zoom = cameraZoomToFitRoom(roomW, roomH, 640, 420);
		expect(zoom).toBeCloseTo(Math.min(640 / roomW, 420 / roomH), 5);
		expect(zoom).toBeLessThan(CAMERA_ZOOM_MAX);
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

describe('cameraRoomCenter', () => {
	it('returns the room midpoint in pixels', () => {
		const kitchenPx = 6 * TILE_SIZE;
		expect(cameraRoomCenter(kitchenPx, kitchenPx)).toEqual({ x: kitchenPx / 2, y: kitchenPx / 2 });
	});
});

describe('cameraLetterboxBounds', () => {
	const kitchenPx = 6 * TILE_SIZE;

	it('expands bounds so the kitchen can center at 4× zoom', () => {
		const zoom = cameraZoomToFitRoom(kitchenPx, kitchenPx, 640, 420);
		const bounds = cameraLetterboxBounds(kitchenPx, kitchenPx, 640, 420, zoom);
		const viewW = 640 / zoom;
		const viewH = 420 / zoom;
		const padX = (viewW - kitchenPx) / 2;
		const padY = (viewH - kitchenPx) / 2;
		expect(bounds.x).toBeCloseTo(-padX, 5);
		expect(bounds.y).toBeCloseTo(-padY, 5);
		expect(bounds.width).toBeCloseTo(viewW, 5);
		expect(bounds.height).toBeCloseTo(viewH, 5);
	});

	it('uses room-sized bounds when the view matches the room exactly', () => {
		const bounds = cameraLetterboxBounds(100, 100, 100, 100, 1);
		expect(bounds.x).toBeCloseTo(0, 5);
		expect(bounds.y).toBeCloseTo(0, 5);
		expect(bounds.width).toBe(100);
		expect(bounds.height).toBe(100);
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
