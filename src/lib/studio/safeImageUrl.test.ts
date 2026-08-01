import { describe, expect, it } from 'vitest';
import { isSafeStudioImageUrl } from './safeImageUrl';

describe('isSafeStudioImageUrl', () => {
	it('accepts data image URLs used by the mock engine', () => {
		expect(isSafeStudioImageUrl('data:image/svg+xml,%3Csvg/%3E')).toBe(true);
		expect(isSafeStudioImageUrl('data:image/png;base64,aaa')).toBe(true);
	});

	it('accepts relative and https URLs', () => {
		expect(isSafeStudioImageUrl('/studio/tiles/walls-floors.png')).toBe(true);
		expect(isSafeStudioImageUrl('https://cdn.example/art.png')).toBe(true);
	});

	it('rejects empty, script, and protocol-relative URLs', () => {
		expect(isSafeStudioImageUrl('')).toBe(false);
		expect(isSafeStudioImageUrl('javascript:alert(1)')).toBe(false);
		expect(isSafeStudioImageUrl('//evil.example/x.png')).toBe(false);
		expect(isSafeStudioImageUrl('data:text/html,hi')).toBe(false);
	});
});
