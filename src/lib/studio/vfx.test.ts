import { describe, expect, it } from 'vitest';
import {
	CASH_BURST_COUNT,
	WORK_PARTICLE_MAX,
	clampCashBurstCount,
	clampWorkParticleCount,
	queryPrefersReducedMotion,
	shouldBurstCashConfetti,
	shouldEmitWorkParticles,
	shouldTriggerCashBurst
} from './vfx';

describe('studio vfx helpers', () => {
	it('emits work particles only while generating/critiquing and not reduced', () => {
		expect(shouldEmitWorkParticles('generating', false)).toBe(true);
		expect(shouldEmitWorkParticles('critiquing', false)).toBe(true);
		expect(shouldEmitWorkParticles('generating', true)).toBe(false);
		expect(shouldEmitWorkParticles('idle', false)).toBe(false);
		expect(shouldEmitWorkParticles('results', false)).toBe(false);
	});

	it('gates cash confetti on reducedVfx', () => {
		expect(shouldBurstCashConfetti(false)).toBe(true);
		expect(shouldBurstCashConfetti(true)).toBe(false);
	});

	it('triggers cash burst on Collect Cash phase edges only', () => {
		expect(shouldTriggerCashBurst('results', 'idle')).toBe(true);
		expect(shouldTriggerCashBurst('results', 'levelComplete')).toBe(true);
		expect(shouldTriggerCashBurst('results', 'failed')).toBe(false);
		expect(shouldTriggerCashBurst('idle', 'idle')).toBe(false);
		expect(shouldTriggerCashBurst(null, 'idle')).toBe(false);
	});

	it('queries prefers-reduced-motion via injectable matchMedia', () => {
		expect(queryPrefersReducedMotion(() => ({ matches: true }))).toBe(true);
		expect(queryPrefersReducedMotion(() => ({ matches: false }))).toBe(false);
	});

	it('exports hard particle caps and clamps counts', () => {
		expect(WORK_PARTICLE_MAX).toBe(12);
		expect(CASH_BURST_COUNT).toBe(18);
		expect(clampWorkParticleCount(99)).toBe(12);
		expect(clampCashBurstCount(-1)).toBe(0);
	});
});
