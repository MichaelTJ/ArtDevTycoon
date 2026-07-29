import { describe, expect, it } from 'vitest';
import { paintProceduralArt } from './proceduralArt';

describe('paintProceduralArt', () => {
	it('returns identical output for the same seed', () => {
		expect(paintProceduralArt(12345)).toBe(paintProceduralArt(12345));
	});

	it('returns different output for different seeds', () => {
		expect(paintProceduralArt(1)).not.toBe(paintProceduralArt(2));
	});

	it('produces valid SVG markup', () => {
		const svg = paintProceduralArt(99);
		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).toContain('viewBox="0 0 512 512"');
	});
});
