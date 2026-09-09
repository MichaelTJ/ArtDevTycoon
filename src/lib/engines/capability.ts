import type { DeviceCapability, EngineRequirements } from '$lib/types/contracts';

const MOBILE_UA = /Android|iPhone|iPad|iPod/i;

/** Probe the device once at startup. Never throws — degrades to no WebGPU on any failure. */
export async function detectCapability(): Promise<DeviceCapability> {
	const fallback: DeviceCapability = {
		webgpu: false,
		fp16: false,
		maxStorageBufferBindingMb: null,
		maxBufferMb: null,
		isMobile: detectIsMobile(),
		deviceMemoryGb: readDeviceMemory()
	};

	try {
		if (!('gpu' in navigator)) {
			return fallback;
		}

		const adapter = await navigator.gpu.requestAdapter();
		if (!adapter) {
			return fallback;
		}

		const fp16 = adapter.features.has('shader-f16');
		const maxStorageBufferBindingMb = bytesToMb(adapter.limits.maxStorageBufferBindingSize);
		const maxBufferMb = bytesToMb(adapter.limits.maxBufferSize);

		return {
			webgpu: true,
			fp16,
			maxStorageBufferBindingMb,
			maxBufferMb,
			isMobile: detectIsMobile(),
			deviceMemoryGb: readDeviceMemory()
		};
	} catch {
		return fallback;
	}
}

/** Can this device run an engine with these requirements? */
export function meetsRequirements(
	capability: DeviceCapability,
	requirements: EngineRequirements
): { ok: true } | { ok: false; reason: string } {
	if (requirements.webgpu && !capability.webgpu) {
		return { ok: false, reason: 'Needs WebGPU. Try Chrome or Edge on a computer.' };
	}

	if (requirements.desktopOnly && capability.isMobile) {
		return { ok: false, reason: 'This engine needs a desktop or laptop.' };
	}

	if (
		capability.maxStorageBufferBindingMb !== null &&
		capability.maxStorageBufferBindingMb < requirements.minStorageBufferMb
	) {
		return { ok: false, reason: 'This device does not have enough GPU memory for this model.' };
	}

	return { ok: true };
}

function detectIsMobile(): boolean {
	const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
	if (nav.userAgentData?.mobile !== undefined) {
		return nav.userAgentData.mobile;
	}
	return MOBILE_UA.test(navigator.userAgent);
}

function readDeviceMemory(): number | null {
	const nav = navigator as Navigator & { deviceMemory?: number };
	return nav.deviceMemory ?? null;
}

function bytesToMb(bytes: number): number {
	return bytes / (1024 * 1024);
}
