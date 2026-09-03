import { describe, expect, it } from 'vitest';
import {
	EXPLORER_CASE_COUNT,
	EXPLORER_CATEGORY_LABELS,
	EXPLORER_PROMPT_CASES,
	ROUND1_CASE_COUNT,
	ROUND1_SUBJECTS,
	ROUND2_CASE_COUNT,
	ROUND2_STYLE_MODIFIERS,
	ROUND3_CASE_COUNT,
	ROUND3_OBJECTS_PER_STYLE,
	ROUND3_SKETCH_STYLES,
	ROUND4_ART_CATEGORIES,
	ROUND4_ART_STYLES,
	ROUND4_CASE_COUNT,
	ROUND4_OBJECTS_PER_STYLE,
	ROUND5_CASE_COUNT,
	ROUND5_RETRY_STYLES,
	ROUND6_BACKGROUNDS,
	ROUND6_CASE_COUNT,
	ROUND7_BACKGROUNDS,
	ROUND7_CASE_COUNT,
	WORKING_SUBJECT_KEYS,
	buildCustomPromptCase
} from './prompts';

describe('modifier explorer2 prompts', () => {
	it('has exactly 100 Round 1 subjects × 3 variants', () => {
		expect(ROUND1_SUBJECTS).toHaveLength(100);
		expect(ROUND1_CASE_COUNT).toBe(300);
	});

	it('has exactly 7 Round 2 style modifiers × 10 working subjects', () => {
		expect(ROUND2_STYLE_MODIFIERS).toHaveLength(7);
		expect(WORKING_SUBJECT_KEYS).toHaveLength(10);
		expect(ROUND2_CASE_COUNT).toBe(70);
	});

	it('has exactly 9 Round 3 sketch styles × 5 objects each', () => {
		expect(ROUND3_SKETCH_STYLES).toHaveLength(9);
		expect(ROUND3_OBJECTS_PER_STYLE).toBe(5);
		expect(ROUND3_CASE_COUNT).toBe(45);
	});

	it('has 6 Round 4 categories × 7 tiers × 5 objects each', () => {
		expect(ROUND4_ART_CATEGORIES).toHaveLength(6);
		expect(ROUND4_ART_STYLES).toHaveLength(42);
		expect(ROUND4_OBJECTS_PER_STYLE).toBe(5);
		expect(ROUND4_CASE_COUNT).toBe(210);
	});

	it('retries the six failed Round 4 styles with five objects each', () => {
		expect(ROUND5_RETRY_STYLES).toHaveLength(6);
		expect(ROUND5_CASE_COUNT).toBe(30);
		for (const style of ROUND5_RETRY_STYLES) {
			expect(ROUND4_ART_STYLES.some((s) => s.key === style.replacesKey)).toBe(true);
		}
	});

	it('totals 739 cases across all rounds', () => {
		expect(EXPLORER_CASE_COUNT).toBe(739);
		expect(EXPLORER_PROMPT_CASES).toHaveLength(739);
	});

	it('uses unique case ids', () => {
		const ids = EXPLORER_PROMPT_CASES.map((c) => c.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('spreads Round 1 subjects evenly across rarity bands', () => {
		const bands = { common: 0, uncommon: 0, rare: 0, 'very-rare': 0 };
		for (const subject of ROUND1_SUBJECTS) {
			bands[subject.rarity] += 1;
		}
		expect(bands).toEqual({ common: 25, uncommon: 25, rare: 25, 'very-rare': 25 });
	});

	it('uses unique subject keys', () => {
		const keys = ROUND1_SUBJECTS.map((s) => s.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('uses unique style modifier keys', () => {
		const keys = ROUND2_STYLE_MODIFIERS.map((s) => s.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('uses unique Round 3 sketch style keys', () => {
		const keys = ROUND3_SKETCH_STYLES.map((s) => s.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('uses unique Round 4 art style keys', () => {
		const keys = ROUND4_ART_STYLES.map((s) => s.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('assigns seven tiers to each Round 4 category', () => {
		for (const category of ROUND4_ART_CATEGORIES) {
			const styles = ROUND4_ART_STYLES.filter((s) => s.categoryKey === category.key);
			expect(styles).toHaveLength(7);
			expect(styles.map((s) => s.tier).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
		}
	});

	it('keeps working subjects resolvable from Round 1', () => {
		const keys = new Set(ROUND1_SUBJECTS.map((s) => s.key));
		for (const key of WORKING_SUBJECT_KEYS) {
			expect(keys.has(key)).toBe(true);
		}
		expect(WORKING_SUBJECT_KEYS.length).toBe(10);
	});

	it('stamps facets for filtering and good-tags', () => {
		for (const testCase of EXPLORER_PROMPT_CASES) {
			expect(EXPLORER_CATEGORY_LABELS[testCase.category]).toBeTruthy();
			expect(testCase.facets.round.key.length).toBeGreaterThan(0);
			expect(testCase.facets.subject.key.length).toBeGreaterThan(0);
			expect(testCase.facets.variant.key.length).toBeGreaterThan(0);
			expect(testCase.prompt.length).toBeGreaterThan(0);
		}
	});

	it('gives Round 1 rarity tags and Round 2/3/4/5 style tags', () => {
		const r1 = EXPLORER_PROMPT_CASES.find((c) => c.category === 'round1-objects');
		const r2 = EXPLORER_PROMPT_CASES.find((c) => c.category === 'round2-simple');
		const r3 = EXPLORER_PROMPT_CASES.find((c) => c.category === 'round3-sketch-tiers');
		const r4 = EXPLORER_PROMPT_CASES.find((c) => c.category === 'round4-art-tiers');
		const r5 = EXPLORER_PROMPT_CASES.find((c) => c.category === 'round5-retries');
		expect(r1?.facets.rarity).toBeTruthy();
		expect(r1?.facets.style).toBeUndefined();
		expect(r2?.facets.style).toBeTruthy();
		expect(r3?.facets.style).toBeTruthy();
		expect(r4?.facets.style).toBeTruthy();
		expect(r4?.facets.medium).toBeTruthy();
		expect(r5?.facets.style).toBeTruthy();
		expect(r5?.facets.medium).toBeTruthy();
		expect(r5?.facets.round.key).toBe('round5');
		const r6 = EXPLORER_PROMPT_CASES.find((c) => c.category === 'round6-backgrounds');
		expect(r6?.facets.background).toBeTruthy();
		expect(r6?.facets.medium).toBeTruthy();
		expect(r6?.facets.round.key).toBe('round6');
		const r7 = EXPLORER_PROMPT_CASES.find((c) => c.category === 'round7-backgrounds');
		expect(r7?.facets.background).toBeTruthy();
		expect(r7?.facets.medium).toBeTruthy();
		expect(r7?.facets.round.key).toBe('round7');
	});

	it('formats Round 1 prompts as "A detailed sketch of {object}"', () => {
		const r1 = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'round1-objects');
		for (const testCase of r1) {
			expect(testCase.prompt).toMatch(/^A detailed sketch of .+/);
		}
		const apple = r1.find((c) => c.facets.subject.key === 'apple');
		expect(apple?.prompt).toBe('A detailed sketch of a red apple');
	});

	it('combines Round 2 modifiers with working subjects', () => {
		const working = new Set(WORKING_SUBJECT_KEYS);
		const r2 = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'round2-simple');
		expect(r2.every((c) => working.has(c.facets.subject.key))).toBe(true);
		const rough = r2.find(
			(c) => c.facets.style?.key === 'rough-sketch' && c.facets.subject.key === 'apple'
		);
		expect(rough?.prompt).toBe('A rough sketch of a red apple');
	});

	it('uses five distinct objects per Round 3 sketch style', () => {
		const r3 = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'round3-sketch-tiers');
		for (const style of ROUND3_SKETCH_STYLES) {
			const styleCases = r3.filter((c) => c.facets.style?.key === style.key);
			expect(styleCases).toHaveLength(5);
			expect(new Set(styleCases.map((c) => c.facets.subject.key)).size).toBe(5);
		}
	});

	it('uses five distinct objects per Round 4 tier', () => {
		const r4 = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'round4-art-tiers');
		for (const style of ROUND4_ART_STYLES) {
			const styleCases = r4.filter((c) => c.facets.style?.key === style.key);
			expect(styleCases).toHaveLength(5);
			expect(new Set(styleCases.map((c) => c.facets.subject.key)).size).toBe(5);
		}
	});

	it('formats Round 3/4 prompts with object, style, and plain backdrop', () => {
		const continuousLine = EXPLORER_PROMPT_CASES.find(
			(c) =>
				c.category === 'round3-sketch-tiers' &&
				c.facets.style?.key === 'continuous-line' &&
				c.facets.subject.key === 'apple'
		);
		expect(continuousLine?.prompt).toBe(
			'A single red apple, continuous line drawing, centered on a plain white background.'
		);

		const gouache = EXPLORER_PROMPT_CASES.find(
			(c) =>
				c.category === 'round4-art-tiers' &&
				c.facets.style?.key === 'loose-gouache' &&
				c.facets.medium?.key === 'watercolor-alternatives'
		);
		expect(gouache?.prompt).toMatch(
			/^A single .+, loose gouache sketch, uneven washes, centered on a plain white background\.$/
		);
	});

	it('reuses the failed Round 4 objects on each Round 5 retry', () => {
		const r4 = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'round4-art-tiers');
		const r5 = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'round5-retries');
		for (const style of ROUND5_RETRY_STYLES) {
			const original = r4
				.filter((c) => c.facets.style?.key === style.replacesKey)
				.map((c) => c.facets.subject.key)
				.sort();
			const retry = r5
				.filter((c) => c.facets.style?.key === style.key)
				.map((c) => c.facets.subject.key)
				.sort();
			expect(retry).toEqual(original);
			expect(retry).toHaveLength(5);
		}
	});

	it('drops the geometry language that failed Round 4', () => {
		const banned = [
			'collage',
			'cutout',
			'architectural',
			'botanical',
			'cross-hatched',
			'isometric',
			'finger-painted'
		];
		for (const style of ROUND5_RETRY_STYLES) {
			const haystack = `${style.key} ${style.label} ${style.phrase}`.toLowerCase();
			for (const token of banned) {
				expect(haystack).not.toContain(token);
			}
		}
	});

	it('pairs each Round 6 background with every medium at the matching skill tier', () => {
		expect(ROUND6_BACKGROUNDS).toHaveLength(7);
		expect(ROUND6_CASE_COUNT).toBe(42);
		const r6 = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'round6-backgrounds');
		const working = new Set(WORKING_SUBJECT_KEYS);
		expect(r6.every((c) => working.has(c.facets.subject.key))).toBe(true);

		for (const background of ROUND6_BACKGROUNDS) {
			const bgCases = r6.filter((c) => c.facets.background?.key === background.key);
			expect(bgCases).toHaveLength(6);
			expect(new Set(bgCases.map((c) => c.facets.medium?.key)).size).toBe(6);
			for (const testCase of bgCases) {
				expect(testCase.prompt).toContain(background.phrase);
			}
		}

		const pencilT1 = r6.find(
			(c) =>
				c.facets.medium?.key === 'pencil-sketchbook' && c.facets.background?.key === 'plain-white'
		);
		expect(pencilT1?.prompt).toContain('messy continuous line graphite drawing');
		expect(pencilT1?.prompt).toContain('on a solid plain white background');

		const inkT1 = r6.find(
			(c) => c.facets.medium?.key === 'ink-charcoal' && c.facets.background?.key === 'plain-white'
		);
		expect(inkT1?.prompt).toContain('smudged, chaotic charcoal scribble');

		const oilT1 = r6.find(
			(c) => c.facets.medium?.key === 'oil-canvas' && c.facets.background?.key === 'plain-white'
		);
		expect(oilT1?.facets.style?.key).toBe('muddy-amateur-oil');
	});

	it('pairs each Round 7 background with every medium at the matching skill tier', () => {
		expect(ROUND7_BACKGROUNDS).toHaveLength(7);
		expect(ROUND7_CASE_COUNT).toBe(42);
		const r7 = EXPLORER_PROMPT_CASES.filter((c) => c.category === 'round7-backgrounds');
		const working = new Set(WORKING_SUBJECT_KEYS);
		expect(r7.every((c) => working.has(c.facets.subject.key))).toBe(true);

		for (const background of ROUND7_BACKGROUNDS) {
			const bgCases = r7.filter((c) => c.facets.background?.key === background.key);
			expect(bgCases).toHaveLength(6);
			expect(new Set(bgCases.map((c) => c.facets.medium?.key)).size).toBe(6);
			for (const testCase of bgCases) {
				expect(testCase.prompt).toContain(background.phrase);
			}
		}

		const pencilT1 = r7.find(
			(c) =>
				c.facets.medium?.key === 'pencil-sketchbook' &&
				c.facets.background?.key === 'unfinished-flat'
		);
		expect(pencilT1?.prompt).toContain('messy continuous line graphite drawing');
		expect(pencilT1?.prompt).toContain('centered on a solid plain white background');

		const master = r7.find((c) => c.facets.background?.key === 'master-presentation');
		expect(master?.prompt).toContain('three-point lighting');
	});

	it('builds a custom prompt case tagged for the gallery', () => {
		const usedIds = new Set<string>();
		const custom = buildCustomPromptCase('a red apple on a white background', usedIds);
		expect(custom.category).toBe('custom');
		expect(custom.prompt).toBe('a red apple on a white background');
		expect(custom.facets.round.key).toBe('custom');
		expect(usedIds.has(custom.id)).toBe(true);
	});
});
