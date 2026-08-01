/** Small rooms may magnify up to 4×; larger rooms zoom out when needed. */
export const CAMERA_ZOOM_MAX = 4;

/**
 * Camera zoom so the full room fits in the viewport with optional padding.
 * Capped at {@link CAMERA_ZOOM_MAX}; larger rooms zoom out when needed.
 */
export function cameraZoomToFitRoom(
	roomWidthPx: number,
	roomHeightPx: number,
	viewportWidthPx: number,
	viewportHeightPx: number,
	paddingPx = 0
): number {
	if (roomWidthPx <= 0 || roomHeightPx <= 0 || viewportWidthPx <= 0 || viewportHeightPx <= 0) {
		return CAMERA_ZOOM_MAX;
	}
	const availW = Math.max(viewportWidthPx - paddingPx * 2, 1);
	const availH = Math.max(viewportHeightPx - paddingPx * 2, 1);
	const fitZoom = Math.min(availW / roomWidthPx, availH / roomHeightPx);
	return Math.min(fitZoom, CAMERA_ZOOM_MAX);
}

/** World-space center of a room in pixels (for `camera.centerOn`). */
export function cameraRoomCenter(
	roomWidthPx: number,
	roomHeightPx: number
): { x: number; y: number } {
	return { x: roomWidthPx / 2, y: roomHeightPx / 2 };
}

/**
 * Camera bounds expanded so a room smaller than the visible world can scroll to
 * viewport center instead of sticking to the top-left origin.
 */
export function cameraLetterboxBounds(
	roomWidthPx: number,
	roomHeightPx: number,
	viewportWidthPx: number,
	viewportHeightPx: number,
	zoom: number
): { x: number; y: number; width: number; height: number } {
	if (
		roomWidthPx <= 0 ||
		roomHeightPx <= 0 ||
		viewportWidthPx <= 0 ||
		viewportHeightPx <= 0 ||
		zoom <= 0
	) {
		return { x: 0, y: 0, width: Math.max(roomWidthPx, 0), height: Math.max(roomHeightPx, 0) };
	}
	const viewW = viewportWidthPx / zoom;
	const viewH = viewportHeightPx / zoom;
	const padX = Math.max(0, (viewW - roomWidthPx) / 2);
	const padY = Math.max(0, (viewH - roomHeightPx) / 2);
	return {
		x: -padX,
		y: -padY,
		width: roomWidthPx + padX * 2,
		height: roomHeightPx + padY * 2
	};
}

/** Default Phaser parent size when layout has not measured yet. */
export const STUDIO_VIEWPORT_DEFAULT_WIDTH = 640;
export const STUDIO_VIEWPORT_DEFAULT_HEIGHT = 420;

/** Read parent size for boot; fall back when the host is not laid out yet. */
export function studioViewportSize(parent: HTMLElement): { width: number; height: number } {
	const width = parent.clientWidth > 0 ? parent.clientWidth : STUDIO_VIEWPORT_DEFAULT_WIDTH;
	const height = parent.clientHeight > 0 ? parent.clientHeight : STUDIO_VIEWPORT_DEFAULT_HEIGHT;
	return { width, height };
}
