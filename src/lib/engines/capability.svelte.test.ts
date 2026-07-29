import { test, expect } from 'vitest';
import { detectCapability, meetsRequirements } from './capability';
import type { DeviceCapability, EngineRequirements } from '$lib/types/contracts';

test('detectCapability resolves without throwing and returns all seven keys', async () => {
	const capability = await detectCapability();
	expect(capability).toHaveProperty('webgpu');
	expect(capability).toHaveProperty('fp16');
	expect(capability).toHaveProperty('maxStorageBufferBindingMb');
	expect(capability).toHaveProperty('maxBufferMb');
	expect(capability).toHaveProperty('isMobile');
	expect(capability).toHaveProperty('deviceMemoryGb');
	expect(typeof capability.webgpu).toBe('boolean');
	expect(typeof capability.fp16).toBe('boolean');
	expect(typeof capability.isMobile).toBe('boolean');
});

test('meetsRequirements passes when WebGPU is not required', () => {
	const capability: DeviceCapability = {
		webgpu: false,
		fp16: false,
		maxStorageBufferBindingMb: null,
		maxBufferMb: null,
		isMobile: true,
		deviceMemoryGb: 4
	};
	const requirements: EngineRequirements = {
		webgpu: false,
		approxDownloadMb: 0,
		minStorageBufferMb: 0,
		desktopOnly: false
	};
	expect(meetsRequirements(capability, requirements)).toEqual({ ok: true });
});

test('meetsRequirements fails when WebGPU is required but unavailable', () => {
	const capability: DeviceCapability = {
		webgpu: false,
		fp16: false,
		maxStorageBufferBindingMb: null,
		maxBufferMb: null,
		isMobile: false,
		deviceMemoryGb: 8
	};
	const requirements: EngineRequirements = {
		webgpu: true,
		approxDownloadMb: 1024,
		minStorageBufferMb: 1024,
		desktopOnly: false
	};
	expect(meetsRequirements(capability, requirements)).toEqual({
		ok: false,
		reason: 'This device does not support WebGPU.'
	});
});

test('meetsRequirements fails on desktop-only engines for mobile devices', () => {
	const capability: DeviceCapability = {
		webgpu: true,
		fp16: true,
		maxStorageBufferBindingMb: 2048,
		maxBufferMb: 2048,
		isMobile: true,
		deviceMemoryGb: 6
	};
	const requirements: EngineRequirements = {
		webgpu: true,
		approxDownloadMb: 1536,
		minStorageBufferMb: 1024,
		desktopOnly: true
	};
	expect(meetsRequirements(capability, requirements)).toEqual({
		ok: false,
		reason: 'This engine needs a desktop or laptop.'
	});
});

test('meetsRequirements fails when storage buffer limit is below minimum', () => {
	const capability: DeviceCapability = {
		webgpu: true,
		fp16: true,
		maxStorageBufferBindingMb: 128,
		maxBufferMb: 256,
		isMobile: false,
		deviceMemoryGb: 8
	};
	const requirements: EngineRequirements = {
		webgpu: true,
		approxDownloadMb: 1024,
		minStorageBufferMb: 1024,
		desktopOnly: false
	};
	expect(meetsRequirements(capability, requirements)).toEqual({
		ok: false,
		reason: 'This device does not have enough GPU memory for this model.'
	});
});

test('meetsRequirements passes when storage buffer limit is unknown but WebGPU is present', () => {
	const capability: DeviceCapability = {
		webgpu: true,
		fp16: false,
		maxStorageBufferBindingMb: null,
		maxBufferMb: null,
		isMobile: false,
		deviceMemoryGb: null
	};
	const requirements: EngineRequirements = {
		webgpu: true,
		approxDownloadMb: 1024,
		minStorageBufferMb: 1024,
		desktopOnly: false
	};
	expect(meetsRequirements(capability, requirements)).toEqual({ ok: true });
});
