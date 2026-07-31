import { describe, expect, it } from 'vitest';
import { EXPLORER_CASE_COUNT, EXPLORER_CATEGORY_LABELS, EXPLORER_PROMPT_CASES } from './prompts';
import type { ModifierCategory } from './types';

describe('modifier explorer prompts', () => {
	it('provides a wide, curated set of test cases', () => {
		expect(EXPLORER_CASE_COUNT).toBeGreaterThanOrEqual(800);
		expect(EXPLORER_CASE_COUNT).toBeLessThanOrEqual(1100);
	});

	it('uses unique case ids', () => {
		const ids = EXPLORER_PROMPT_CASES.map((testCase) => testCase.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('covers every axis sweep and formula-mix category', () => {
		const categories = new Set(EXPLORER_PROMPT_CASES.map((testCase) => testCase.category));
		const expected: ModifierCategory[] = [
			'axis-style',
			'axis-subject',
			'axis-lighting',
			'axis-detail',
			'formula-mix',
			'formula-tech'
		];
		for (const category of expected) {
			expect(categories.has(category)).toBe(true);
		}
	});

	it('labels every category and keeps prompts/subjects non-empty', () => {
		for (const testCase of EXPLORER_PROMPT_CASES) {
			expect(EXPLORER_CATEGORY_LABELS[testCase.category]).toBeTruthy();
			expect(testCase.categoryLabel).toBeTruthy();
			expect(testCase.prompt.length).toBeGreaterThan(0);
			expect(testCase.subject.length).toBeGreaterThan(0);
		}
	});

	it('stamps every case with exact facets used to build the prompt', () => {
		for (const testCase of EXPLORER_PROMPT_CASES) {
			expect(testCase.facets.style.level).toBeGreaterThanOrEqual(1);
			expect(testCase.facets.style.level).toBeLessThanOrEqual(5);
			expect(testCase.facets.subject.level).toBeGreaterThanOrEqual(1);
			expect(testCase.facets.lighting.level).toBeGreaterThanOrEqual(1);
			expect(testCase.facets.detail.level).toBeGreaterThanOrEqual(1);
			expect(testCase.facets.mood.key.length).toBeGreaterThan(0);
			expect(testCase.prompt).toContain(testCase.facets.mood.label);
		}
	});

	it('sweeps every axis from novice (1) through expert (5)', () => {
		for (const axis of ['style', 'subject', 'lighting', 'detail'] as const) {
			const sweepCategory = `axis-${axis}` as ModifierCategory;
			const levels = new Set(
				EXPLORER_PROMPT_CASES.filter((c) => c.category === sweepCategory).map(
					(c) => c.facets[axis].level
				)
			);
			expect(levels).toEqual(new Set([1, 2, 3, 4, 5]));
		}
	});

	it('keeps the formula order style → subject → lighting → detail → mood in the sentence', () => {
		const mix = EXPLORER_PROMPT_CASES.find((c) => c.category === 'formula-mix');
		expect(mix).toBeTruthy();
		const f = mix!.facets;
		const prompt = mix!.prompt;
		expect(prompt.indexOf(f.style.label)).toBeLessThan(prompt.indexOf(f.lighting.label));
		expect(prompt.indexOf(f.lighting.label)).toBeLessThan(prompt.indexOf(f.detail.label));
		expect(prompt.indexOf(f.detail.label)).toBeLessThan(prompt.indexOf(f.mood.label));
	});

	it('appends a technical cue only for the formula-tech category', () => {
		const tech = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'formula-tech');
		expect(tech.length).toBeGreaterThan(0);
		expect(tech.every((c) => c.facets.tech !== undefined)).toBe(true);
		expect(tech.every((c) => c.prompt.includes(c.facets.tech!.label))).toBe(true);

		const mix = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'formula-mix');
		expect(mix.every((c) => c.facets.tech === undefined)).toBe(true);
	});
});
