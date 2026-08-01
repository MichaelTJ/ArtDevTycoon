import { describe, expect, it, vi } from 'vitest';
import { applyDomEditableKeyboardGate } from './domInputKeyboardGate';

function mockKeyboard() {
	return {
		enabled: true,
		disableGlobalCapture: vi.fn(),
		enableGlobalCapture: vi.fn(),
		resetKeys: vi.fn()
	};
}

describe('applyDomEditableKeyboardGate', () => {
	it('disables plugin capture and resets keys when a DOM field is focused', () => {
		const keyboard = mockKeyboard();
		applyDomEditableKeyboardGate(keyboard, true);
		expect(keyboard.enabled).toBe(false);
		expect(keyboard.disableGlobalCapture).toHaveBeenCalledTimes(1);
		expect(keyboard.enableGlobalCapture).not.toHaveBeenCalled();
		expect(keyboard.resetKeys).toHaveBeenCalledTimes(1);
	});

	it('re-enables plugin capture when focus leaves editable controls', () => {
		const keyboard = mockKeyboard();
		keyboard.enabled = false;
		applyDomEditableKeyboardGate(keyboard, false);
		expect(keyboard.enabled).toBe(true);
		expect(keyboard.enableGlobalCapture).toHaveBeenCalledTimes(1);
		expect(keyboard.disableGlobalCapture).not.toHaveBeenCalled();
		expect(keyboard.resetKeys).toHaveBeenCalledTimes(1);
	});

	it('no-ops when keyboard is missing', () => {
		expect(() => applyDomEditableKeyboardGate(null, true)).not.toThrow();
		expect(() => applyDomEditableKeyboardGate(undefined, false)).not.toThrow();
	});
});
