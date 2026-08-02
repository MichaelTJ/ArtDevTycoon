import { describe, expect, it, vi } from 'vitest';
import { getBrushProfile } from '$lib/data/brushProfiles';
import {
	applyBrushStrokeStyle,
	effectiveBrushSize,
	grainSeed,
	resetBrushContext,
	stampCrayonGrain,
	stampInkBleed
} from './brushStroke';

function mockCtx(): CanvasRenderingContext2D {
	return {
		globalAlpha: 1,
		globalCompositeOperation: 'source-over',
		lineCap: 'butt',
		lineJoin: 'miter',
		lineWidth: 1,
		strokeStyle: '#000',
		shadowBlur: 0,
		shadowColor: 'transparent',
		fillStyle: '#000',
		save: vi.fn(),
		restore: vi.fn(),
		beginPath: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn()
	} as unknown as CanvasRenderingContext2D;
}

describe('effectiveBrushSize', () => {
	it('clamps through profile multiplier', () => {
		const pencil = getBrushProfile('pencil');
		expect(effectiveBrushSize(8, pencil)).toBeCloseTo(4.4, 1);
		expect(effectiveBrushSize(100, pencil)).toBe(pencil.maxSize);

		const crayon = getBrushProfile('crayon');
		expect(effectiveBrushSize(2, crayon)).toBe(crayon.minSize);
	});
});

describe('applyBrushStrokeStyle', () => {
	it('sets medium-specific opacity and soft edge', () => {
		const ctx = mockCtx();
		const watercolor = getBrushProfile('watercolor');
		applyBrushStrokeStyle(ctx, watercolor, '#2563eb', 10);

		expect(ctx.globalAlpha).toBe(watercolor.opacity);
		expect(ctx.shadowBlur).toBe(watercolor.softEdge);
		expect(ctx.shadowColor).toBe('#2563eb');
		expect(ctx.lineWidth).toBe(effectiveBrushSize(10, watercolor));
	});

	it('resetBrushContext restores defaults', () => {
		const ctx = mockCtx();
		applyBrushStrokeStyle(ctx, getBrushProfile('watercolor'), '#000', 10);
		resetBrushContext(ctx);
		expect(ctx.globalAlpha).toBe(1);
		expect(ctx.shadowBlur).toBe(0);
	});
});

describe('stamp helpers', () => {
	it('stampCrayonGrain draws multiple arcs', () => {
		const ctx = mockCtx();
		stampCrayonGrain(ctx, 20, 30, 8, '#dc2626', grainSeed(20, 30));
		expect(ctx.arc).toHaveBeenCalled();
		expect(ctx.fill).toHaveBeenCalled();
	});

	it('stampInkBleed uses save/restore and arc', () => {
		const ctx = mockCtx();
		const ink = getBrushProfile('ink');
		stampInkBleed(ctx, 50, 50, ink, '#1c1917', 8);
		expect(ctx.save).toHaveBeenCalled();
		expect(ctx.restore).toHaveBeenCalled();
		expect(ctx.arc).toHaveBeenCalled();
	});
});

describe('grainSeed', () => {
	it('is deterministic for coordinates', () => {
		expect(grainSeed(10, 20)).toBe(grainSeed(10, 20));
		expect(grainSeed(10, 20)).not.toBe(grainSeed(11, 20));
	});
});
