/** Never magnify beyond 1:1 — small rooms letterbox instead of filling the canvas. */
export const CAMERA_ZOOM_MAX = 1;

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

/** Default Phaser parent size when layout has not measured yet. */
export const STUDIO_VIEWPORT_DEFAULT_WIDTH = 640;
export const STUDIO_VIEWPORT_DEFAULT_HEIGHT = 420;

/** Read parent size for boot; fall back when the host is not laid out yet. */
export function studioViewportSize(parent: HTMLElement): { width: number; height: number } {
	const width = parent.clientWidth > 0 ? parent.clientWidth : STUDIO_VIEWPORT_DEFAULT_WIDTH;
	const height = parent.clientHeight > 0 ? parent.clientHeight : STUDIO_VIEWPORT_DEFAULT_HEIGHT;
	return { width, height };
}
