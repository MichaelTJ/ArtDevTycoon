import { describe, expect, it, vi } from 'vitest';
import { getBrushProfile } from '$lib/data/brushProfiles';
import {
	applyBrushStrokeStyle,
	effectiveBrushSize,
	grainSeed,
	resetBrushContext,
	stampBrushGrain,
	stampCharcoalGrain,
	stampCrayonGrain,
	stampInkBleed,
	stampOilBristle,
	stampOilFlat,
	stampOilKnife,
	stampOilStroke
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
		fill: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		translate: vi.fn(),
		rotate: vi.fn(),
		fillRect: vi.fn(),
		closePath: vi.fn()
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

	it('stampCharcoalGrain is deterministic and denser than crayon', () => {
		const ctxA = mockCtx();
		const ctxB = mockCtx();
		const seed = grainSeed(20, 30);
		stampCharcoalGrain(ctxA, 20, 30, 8, '#0a0a0a', seed);
		stampCharcoalGrain(ctxB, 20, 30, 8, '#0a0a0a', seed);
		expect(vi.mocked(ctxA.arc).mock.calls).toEqual(vi.mocked(ctxB.arc).mock.calls);
		const charcoalDots = vi.mocked(ctxA.arc).mock.calls.length;
		expect(charcoalDots).toBeGreaterThan(3);

		const crayonCtx = mockCtx();
		stampCrayonGrain(crayonCtx, 20, 30, 8, '#dc2626', seed);
		expect(charcoalDots).toBeGreaterThan(vi.mocked(crayonCtx.arc).mock.calls.length);
	});

	it('stampBrushGrain uses charcoal for ink profile', () => {
		const ctx = mockCtx();
		const ink = getBrushProfile('ink');
		stampBrushGrain(ctx, ink, 40, 40, 8, '#0a0a0a', grainSeed(40, 40));
		expect(ctx.arc).toHaveBeenCalled();
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

describe('oil stamps', () => {
	it('stampOilBristle draws five hairs', () => {
		const ctx = mockCtx();
		stampOilBristle(ctx, 10, 20, 5, 18, 8, '#d4a017', 42);
		expect(ctx.moveTo).toHaveBeenCalledTimes(5);
		expect(ctx.lineTo).toHaveBeenCalledTimes(5);
		expect(ctx.stroke).toHaveBeenCalledTimes(5);
	});

	it('stampOilBristle is deterministic', () => {
		const ctxA = mockCtx();
		const ctxB = mockCtx();
		stampOilBristle(ctxA, 10, 20, 5, 18, 8, '#d4a017', 42);
		stampOilBristle(ctxB, 10, 20, 5, 18, 8, '#d4a017', 42);
		expect(vi.mocked(ctxA.moveTo).mock.calls).toEqual(vi.mocked(ctxB.moveTo).mock.calls);
		expect(vi.mocked(ctxA.lineTo).mock.calls).toEqual(vi.mocked(ctxB.lineTo).mock.calls);
	});

	it('stampOilFlat spans last→current and rotates to the segment angle', () => {
		const ctx = mockCtx();
		stampOilFlat(ctx, 10, 20, 5, 18, 8, '#d4a017');
		const dist = Math.hypot(5, 2);
		expect(ctx.translate).toHaveBeenCalledWith(5, 18);
		expect(ctx.rotate).toHaveBeenCalledWith(Math.atan2(2, 5));
		expect(ctx.fillRect).toHaveBeenCalledOnce();
		const rect = vi.mocked(ctx.fillRect).mock.calls[0];
		expect(rect?.[2]).toBeGreaterThanOrEqual(dist);
	});

	it('stampOilKnife spans last→current and rotates to the segment angle', () => {
		const ctx = mockCtx();
		stampOilKnife(ctx, 10, 20, 5, 18, 8, '#d4a017');
		expect(ctx.translate).toHaveBeenCalledWith(5, 18);
		expect(ctx.rotate).toHaveBeenCalledWith(Math.atan2(2, 5));
		expect(ctx.moveTo).toHaveBeenCalledWith(0, -8 * 0.42);
		expect(ctx.lineTo).toHaveBeenCalledWith(Math.hypot(5, 2), 0);
		expect(ctx.closePath).toHaveBeenCalledOnce();
		expect(ctx.fill).toHaveBeenCalledOnce();
	});

	it('stampOilStroke round is a no-op', () => {
		const ctx = mockCtx();
		stampOilStroke(ctx, 'round', 10, 20, 5, 18, 8, '#d4a017', 1);
		expect(ctx.fill).not.toHaveBeenCalled();
		expect(ctx.stroke).not.toHaveBeenCalled();
	});

	it('stampOilStroke unknown kind is a no-op', () => {
		const ctx = mockCtx();
		stampOilStroke(ctx, 'unknown' as 'round', 10, 20, 5, 18, 8, '#d4a017', 1);
		expect(ctx.fill).not.toHaveBeenCalled();
		expect(ctx.stroke).not.toHaveBeenCalled();
	});
});
