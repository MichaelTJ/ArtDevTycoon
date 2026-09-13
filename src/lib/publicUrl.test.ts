import { describe, expect, it } from 'vitest';
import { publicUrl } from './publicUrl';

describe('publicUrl', () => {
	it('leaves site-root static paths unchanged when BASE_URL is /', () => {
		expect(publicUrl('/studio/tiles/walls-floors.png')).toBe('/studio/tiles/walls-floors.png');
		expect(publicUrl('/avatars/c1.svg')).toBe('/avatars/c1.svg');
	});

	it('leaves data URLs, blobs, and absolute URLs unchanged', () => {
		expect(publicUrl('data:image/png;base64,aa')).toBe('data:image/png;base64,aa');
		expect(publicUrl('blob:http://localhost/1')).toBe('blob:http://localhost/1');
		expect(publicUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
	});

	it('ignores protocol-relative and empty values', () => {
		expect(publicUrl('//cdn.example.com/x.png')).toBe('//cdn.example.com/x.png');
		expect(publicUrl('')).toBe('');
	});
});
