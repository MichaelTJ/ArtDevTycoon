import { describe, expect, it } from 'vitest';
import { LEVEL_1_BRIEFS } from '$lib/data/briefs';
import { artworkSchema, critiqueDraftSchema } from '$lib/types/contracts';
import { EngineError } from '../errors';
import { MockEngine } from './mockEngine';

const c1 = LEVEL_1_BRIEFS.find((b) => b.id === 'c1')!;

describe('MockEngine', () => {
	const engine = new MockEngine();

	it('returns identical Artwork and CritiqueDraft for identical input', async () => {
		const generateInput = {
			playerPrompt: 'a cozy coffee cup on a wooden table',
			prompt: 'a cozy coffee cup on a wooden table, flat color, crayon'
		};
		const artworkA = await engine.generate(generateInput);
		const artworkB = await engine.generate(generateInput);
		expect(artworkA.id).toBe(artworkB.id);
		expect(artworkA.imageUrl).toBe(artworkB.imageUrl);
		expect(artworkA.playerPrompt).toBe(artworkB.playerPrompt);

		const critiqueInput = {
			brief: c1,
			playerPrompt: generateInput.playerPrompt,
			artwork: artworkA
		};
		const critiqueA = await engine.critique(critiqueInput);
		const critiqueB = await engine.critique(critiqueInput);
		expect(critiqueA).toEqual(critiqueB);
	});

	it('parses generate output against artworkSchema', async () => {
		const artwork = await engine.generate({
			playerPrompt: 'cat',
			prompt: 'cat, flat color'
		});
		expect(() => artworkSchema.parse(artwork)).not.toThrow();
	});

	it('parses critique output against critiqueDraftSchema', async () => {
		const artwork = await engine.generate({
			playerPrompt: 'a cozy coffee cup on a wooden table',
			prompt: 'a cozy coffee cup on a wooden table, flat color'
		});
		const critique = await engine.critique({
			brief: c1,
			playerPrompt: 'a cozy coffee cup on a wooden table',
			artwork
		});
		expect(() => critiqueDraftSchema.parse(critique)).not.toThrow();
	});

	it('scores c1 coffee prompt at 10 and dragon at 1', async () => {
		const goodArt = await engine.generate({
			playerPrompt: 'a cozy coffee cup on a wooden table',
			prompt: 'a cozy coffee cup on a wooden table, flat color'
		});
		const goodCritique = await engine.critique({
			brief: c1,
			playerPrompt: 'a cozy coffee cup on a wooden table',
			artwork: goodArt
		});
		expect(goodCritique.accuracyScore).toBe(10);

		const badArt = await engine.generate({
			playerPrompt: 'dragon',
			prompt: 'dragon, flat color'
		});
		const badCritique = await engine.critique({
			brief: c1,
			playerPrompt: 'dragon',
			artwork: badArt
		});
		expect(badCritique.accuracyScore).toBe(1);
	});

	it('substitutes all template placeholders in reviews', async () => {
		for (const brief of LEVEL_1_BRIEFS) {
			const artwork = await engine.generate({
				playerPrompt: brief.preferredKeywords.join(' '),
				prompt: `${brief.preferredKeywords.join(' ')}, flat color`
			});
			const critique = await engine.critique({
				brief,
				playerPrompt: brief.preferredKeywords.join(' '),
				artwork
			});
			expect(critique.criticReview).not.toMatch(/\{(client|missed|matched)\}/);
		}
	});

	it('throws EngineError cancelled when signal is already aborted', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			engine.generate({
				playerPrompt: 'test',
				prompt: 'test, flat color',
				signal: controller.signal
			})
		).rejects.toMatchObject({ code: 'cancelled' });

		const artwork = await engine.generate({
			playerPrompt: 'test',
			prompt: 'test, flat color'
		});

		await expect(
			engine.critique({
				brief: c1,
				playerPrompt: 'test',
				artwork,
				signal: controller.signal
			})
		).rejects.toMatchObject({ code: 'cancelled' });
	});

	it('echoes playerPrompt verbatim and never leaks the built prompt', async () => {
		const playerPrompt = 'a dragon';
		const prompt = 'a dragon, flat color, simple line art, crayon texture, amateur style';
		const artwork = await engine.generate({ playerPrompt, prompt });

		expect(artwork.playerPrompt).toBe('a dragon');
		expect(artwork.playerPrompt).not.toContain('flat color');
		expect(artwork.playerPrompt).not.toContain('crayon');
	});
});

describe('EngineError', () => {
	it('carries the cancelled code', () => {
		const error = new EngineError('cancelled', 'cancelled');
		expect(error).toBeInstanceOf(EngineError);
		expect(error.code).toBe('cancelled');
	});
});
