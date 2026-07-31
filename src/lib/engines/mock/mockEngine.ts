import { scorePrompt, selectBestCluster, usesInterpretationScoring } from '$lib/game';
import {
	artworkSchema,
	critiqueDraftSchema,
	type ArtEngine,
	type Artwork,
	type ClientBrief,
	type CritiqueDraft,
	type DeviceCapability,
	type EngineAvailability,
	type LoadProgress
} from '$lib/types/contracts';
import { buildTitle } from '../critiqueProtocol';
import { EngineError } from '../errors';
import { hashString, mulberry32, pick } from '../random';
import { paintProceduralArt } from './proceduralArt';
import { bandForScore, REVIEW_TEMPLATES } from './reviewTemplates';

/** Review lines for abstract briefs that committed to an interpretation cluster. */
const ABSTRACT_REVIEW_TEMPLATES = {
	poor: [
		'{client} asked for a feeling — you answered with {label}, but barely. {missed} is still missing.',
		'An abstract brief deserved more than this whisper of {label}.'
	],
	middling: [
		'{client} asked for a feeling — you answered with {label}. It is halfway there.',
		'I can see {matched} in this reading of {label}. Rough, but sincere.'
	],
	good: [
		'{client} asked for a feeling — you answered with {label}. A solid concrete scene.',
		'Committing to {label} was the right call. {matched} carries the mood.'
	],
	excellent: [
		'{client} asked for a feeling — you answered with {label}. Spot on.',
		'Exactly the kind of invented scene {client} hoped for — {label}, fully realised.'
	]
} as const;

/** Procedural art engine — always available, deterministic, no download or GPU required. */
export class MockEngine implements ArtEngine {
	readonly id = 'mock' as const;
	readonly displayName = 'Crayon Mode';
	readonly description = 'Instant procedural art. No download, works on any device.';
	readonly requirements = {
		webgpu: false,
		approxDownloadMb: 0,
		minStorageBufferMb: 0,
		desktopOnly: false
	};
	readonly capabilities = { generate: true, critique: true };

	/** Mock is always runnable on every device. */
	async probe(capability: DeviceCapability): Promise<EngineAvailability> {
		void capability;
		return { available: true, requiresDownload: false, approxDownloadMb: 0 };
	}

	/** Nothing to download — resolves immediately. */
	async load(options?: {
		onProgress?: (progress: LoadProgress) => void;
		signal?: AbortSignal;
	}): Promise<void> {
		void options;
		return;
	}

	async generate(input: {
		playerPrompt: string;
		prompt: string;
		seed?: number;
		signal?: AbortSignal;
	}): Promise<Artwork> {
		throwIfAborted(input.signal);

		const started = performance.now();
		const seed = input.seed ?? hashString(input.prompt);
		const svg = paintProceduralArt(seed);
		const imageUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
		const generationMs = Math.max(0, Math.round(performance.now() - started));

		const artwork: Artwork = {
			id: `mock-${seed.toString(36)}`,
			imageUrl,
			playerPrompt: input.playerPrompt,
			width: 512,
			height: 512,
			generationMs,
			engineId: 'mock'
		};

		return artworkSchema.parse(artwork);
	}

	async critique(input: {
		brief: ClientBrief;
		playerPrompt: string;
		artwork: Artwork;
		signal?: AbortSignal;
	}): Promise<CritiqueDraft> {
		throwIfAborted(input.signal);

		const breakdown = scorePrompt(input.brief, input.playerPrompt);
		const seed = hashString(`${input.brief.id}:${input.playerPrompt}`);
		const title = buildTitle(input.playerPrompt, seed);
		const review = buildMockReview(
			input.brief,
			input.playerPrompt,
			breakdown.accuracyScore,
			breakdown.matchedKeywords,
			breakdown.missedKeywords,
			seed
		);

		return critiqueDraftSchema.parse({
			title,
			accuracyScore: breakdown.accuracyScore,
			criticReview: review
		});
	}

	async unload(): Promise<void> {
		return;
	}
}

function buildMockReview(
	brief: ClientBrief,
	playerPrompt: string,
	accuracyScore: number,
	matched: readonly string[],
	missed: readonly string[],
	seed: number
): string {
	const band = bandForScore(accuracyScore);
	const rng = mulberry32(seed);
	const matchedWord = matched[0] ?? 'the subject';
	const missedWord = missed[0] ?? 'the point';

	if (usesInterpretationScoring(brief)) {
		const best = selectBestCluster(brief, playerPrompt);
		if (best && best.ratio > 0) {
			const templates = ABSTRACT_REVIEW_TEMPLATES[band];
			const template = pick(templates, rng);
			return template
				.replaceAll('{client}', brief.clientName)
				.replaceAll('{label}', best.cluster.label)
				.replaceAll('{matched}', matchedWord)
				.replaceAll('{missed}', missedWord);
		}
	}

	const templates = REVIEW_TEMPLATES[band];
	const template = pick(templates, rng);
	return template
		.replaceAll('{client}', brief.clientName)
		.replaceAll('{matched}', matchedWord)
		.replaceAll('{missed}', missedWord);
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new EngineError('cancelled', 'The operation was cancelled.');
	}
}
