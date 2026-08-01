import { describe, expect, it } from 'vitest';
import { KITCHEN_BRIEFS } from '$lib/data/kitchenBriefs';
import { artworkSchema, critiqueDraftSchema } from '$lib/types/contracts';
import { EngineError } from '../errors';
import { MockEngine } from './mockEngine';

const c1 = KITCHEN_BRIEFS.find((b) => b.id === 'c1')!;
const c6 = KITCHEN_BRIEFS.find((b) => b.id === 'c6')!;

describe('MockEngine', () => {
	const engine = new MockEngine();

	it('returns identical Artwork and CritiqueDraft for identical input', async () => {
		const generateInput = {
			playerPrompt: 'a fluffy cat',
			prompt: 'a fluffy cat, flat color, crayon'
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

	it('uses sketchImage as artwork when provided', async () => {
		const tinyPng = Uint8Array.from(
			atob(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
			),
			(c) => c.charCodeAt(0)
		);
		const sketch = new Blob([tinyPng], { type: 'image/png' });
		const artwork = await engine.generate({
			playerPrompt: 'epic masterpiece',
			prompt: 'epic masterpiece, crayon',
			sketchImage: sketch
		});
		expect(artwork.playerPrompt).toBe('epic masterpiece');
		expect(artwork.imageUrl.startsWith('data:image/png;base64,')).toBe(true);
		expect(() => artworkSchema.parse(artwork)).not.toThrow();
	});

	it('parses critique output against critiqueDraftSchema', async () => {
		const artwork = await engine.generate({
			playerPrompt: 'a fluffy cat',
			prompt: 'a fluffy cat, flat color'
		});
		const critique = await engine.critique({
			brief: c1,
			playerPrompt: 'a fluffy cat',
			artwork
		});
		expect(() => critiqueDraftSchema.parse(critique)).not.toThrow();
	});

	it('scores c1 cat prompt at 10 and dog at 1', async () => {
		const goodArt = await engine.generate({
			playerPrompt: 'cat',
			prompt: 'cat, flat color'
		});
		const goodCritique = await engine.critique({
			brief: c1,
			playerPrompt: 'cat',
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

	it('scores abstract parrot at accuracy 1 and full cluster at 10', async () => {
		const art = await engine.generate({
			playerPrompt: 'placeholder',
			prompt: 'placeholder, flat color'
		});
		const parrot = await engine.critique({
			brief: c6,
			playerPrompt: 'I miss the old days',
			artwork: art
		});
		expect(parrot.accuracyScore).toBe(1);

		const full = await engine.critique({
			brief: c6,
			playerPrompt: 'sunday dinner with family around the tablecloth',
			artwork: art
		});
		expect(full.accuracyScore).toBe(10);
	});

	it('names the interpretation cluster in abstract reviews', async () => {
		const artwork = await engine.generate({
			playerPrompt: 'a faded sepia photograph in a family album',
			prompt: 'a faded sepia photograph in a family album, flat color'
		});
		const critique = await engine.critique({
			brief: c6,
			playerPrompt: 'a faded sepia photograph in a family album',
			artwork
		});
		expect(critique.criticReview.toLowerCase()).toMatch(/photograph|faded/);
	});

	it('substitutes all template placeholders in reviews', async () => {
		for (const brief of KITCHEN_BRIEFS) {
			const prompt =
				brief.interpretationClusters?.[0]?.keywords.join(' ') ?? brief.preferredKeywords.join(' ');
			const artwork = await engine.generate({
				playerPrompt: prompt,
				prompt: `${prompt}, flat color`
			});
			const critique = await engine.critique({
				brief,
				playerPrompt: prompt,
				artwork
			});
			expect(critique.criticReview).not.toMatch(/\{(client|missed|matched|label)\}/);
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
