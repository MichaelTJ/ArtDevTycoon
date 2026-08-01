/** Minimal Phaser keyboard surface used by the DOM-editable focus gate. */
export interface StudioKeyboardGate {
	enabled: boolean;
	disableGlobalCapture(): void;
	enableGlobalCapture(): void;
	resetKeys(): void;
}

/**
 * While a DOM text control has focus, stop Phaser from consuming captured keys
 * (`addKeys` / `createCursorKeys` register global `preventDefault` on WASD, arrows, E).
 * Disabling the plugin alone does not release those captures.
 */
export function applyDomEditableKeyboardGate(
	keyboard: StudioKeyboardGate | null | undefined,
	focused: boolean
): void {
	if (!keyboard) return;

	if (focused) {
		keyboard.enabled = false;
		keyboard.disableGlobalCapture();
		keyboard.resetKeys();
		return;
	}

	keyboard.enabled = true;
	keyboard.enableGlobalCapture();
	keyboard.resetKeys();
}
