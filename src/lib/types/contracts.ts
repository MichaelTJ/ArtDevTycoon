/**
 * FROZEN CONTRACT — the single source of truth shared by every layer of the game.
 *
 * The UI, the domain logic, the API routes and the Python sidecar all agree on the
 * shapes in this file. It is orchestrator-owned: task agents import from it and MUST
 * NOT edit it. If a change is genuinely required, request it in your handoff report
 * rather than editing, because a unilateral change here silently breaks every other
 * agent working in parallel.
 *
 * Anything crossing a trust boundary (an HTTP body, a model's JSON) is validated with
 * the Zod schemas below rather than cast, because a type assertion on a language
 * model's output is a lie we would only discover at runtime.
 */

import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Level 1 tuning                                                             */
/* -------------------------------------------------------------------------- */

/**
 * All Level 1 balance numbers in one place so designers can tune the game without
 * hunting through logic. Level 2+ will supply a different object of the same shape.
 */
export const LEVEL_1 = {
	id: 1,
	name: 'Garage Studio',
	startingCash: 100,
	/** Commissions required to unlock the commercial gallery. */
	targetCommissions: 5,
	/** Cash required, alongside the commission count, to win Level 1. */
	targetCash: 500,
	/**
	 * Appended to every player prompt before generation. Never shown to the player:
	 * the comedy of Level 1 is that they write "epic masterpiece" and get crayon.
	 */
	promptModifiers:
		'flat color, simple line art, crayon texture, amateur style, low detail, basic shading',
	/** Hard ceiling on Level 1 scores, so early art always reads as amateur. */
	maxScore: 10
} as const;

export type LevelConfig = typeof LEVEL_1;

/* -------------------------------------------------------------------------- */
/* Client briefs                                                              */
/* -------------------------------------------------------------------------- */

export const clientBriefSchema = z.object({
	id: z.string().min(1),
	clientName: z.string().min(1),
	avatarUrl: z.string().min(1),
	/** The commission as the client phrases it, shown verbatim in their speech bubble. */
	requestText: z.string().min(1),
	/** Maximum payout when the player nails the brief perfectly. */
	budget: z.number().int().positive(),
	/**
	 * Concepts the critic checks the player's prompt against. Matching is fuzzy and
	 * lives in the domain layer, so these are plain concepts, not regex.
	 */
	preferredKeywords: z.array(z.string().min(1)).min(1)
});

export type ClientBrief = z.infer<typeof clientBriefSchema>;

/* -------------------------------------------------------------------------- */
/* Art critic evaluation                                                      */
/* -------------------------------------------------------------------------- */

const scoreSchema = z.number().int().min(1).max(LEVEL_1.maxScore);

/**
 * The critic's verdict. This exact shape is what the sidecar must emit and what the
 * results modal renders, so it is validated on the way in from the model.
 */
export const critiqueSchema = z.object({
	/** A gallery title for the piece, invented by the critic. */
	title: z.string().min(1).max(120),
	/** How faithfully the artwork serves the client's brief, 1-10. */
	accuracyScore: scoreSchema,
	/** How imaginative and detailed the player's prompt was, 1-10. */
	creativityScore: scoreSchema,
	/** One or two sentences of in-character criticism shown to the player. */
	criticReview: z.string().min(1).max(600),
	/** Cash awarded, already clamped to the brief's budget by the domain layer. */
	finalPayout: z.number().int().min(0)
});

export type Critique = z.infer<typeof critiqueSchema>;

/* -------------------------------------------------------------------------- */
/* Artwork                                                                    */
/* -------------------------------------------------------------------------- */

export const artworkSchema = z.object({
	id: z.string().min(1),
	/** Displayable image source: an HTTP path or a `data:` URL. */
	imageUrl: z.string().min(1),
	/** Exactly what the player typed, for the portfolio and for scoring. */
	playerPrompt: z.string(),
	/** Milliseconds the model took, surfaced in dev tooling to spot slow paths. */
	generationMs: z.number().nonnegative(),
	/** Which backend produced this, so mock and real art are distinguishable. */
	provider: z.enum(['mock', 'sidecar'])
});

export type Artwork = z.infer<typeof artworkSchema>;

/** A completed commission as it appears in the bottom portfolio strip. */
export const galleryEntrySchema = z.object({
	id: z.string().min(1),
	imageUrl: z.string().min(1),
	title: z.string().min(1),
	payout: z.number().int().min(0),
	/** Mean of accuracy and creativity, rounded — the single headline number. */
	score: z.number().min(0).max(LEVEL_1.maxScore),
	clientName: z.string().min(1),
	completedAt: z.number().int().nonnegative()
});

export type GalleryEntry = z.infer<typeof galleryEntrySchema>;

/* -------------------------------------------------------------------------- */
/* Game state                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The center panel is a state machine. Naming the phases explicitly keeps the UI
 * honest: every phase must render something, including the failure phase.
 */
export type GamePhase =
	| 'idle' // no client present; waiting for the player to invite one
	| 'briefing' // client is here, player is writing their prompt
	| 'generating' // request in flight
	| 'results' // artwork and critique ready, awaiting "Collect Cash"
	| 'failed' // generation or evaluation failed; player may retry
	| 'levelComplete'; // win condition met

export interface GameState {
	phase: GamePhase;
	cash: number;
	reputation: number;
	commissionsCompleted: number;
	currentClient: ClientBrief | null;
	/** Populated only in the `results` phase. */
	currentArtwork: Artwork | null;
	currentCritique: Critique | null;
	/** Player-facing message for the `failed` phase. */
	errorMessage: string | null;
	galleryHistory: GalleryEntry[];
}

/* -------------------------------------------------------------------------- */
/* HTTP API                                                                   */
/* -------------------------------------------------------------------------- */

export const generateRequestSchema = z.object({
	prompt: z.string().min(1, 'Describe the artwork before creating it.').max(500),
	/** Optional seed so tests and bug reports can reproduce an exact image. */
	seed: z.number().int().nonnegative().optional()
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const generateResponseSchema = z.object({ artwork: artworkSchema });
export type GenerateResponse = z.infer<typeof generateResponseSchema>;

export const evaluateRequestSchema = z.object({
	brief: clientBriefSchema,
	playerPrompt: z.string().min(1).max(500),
	/** The generated image, so a vision model can critique what was actually made. */
	imageUrl: z.string().min(1)
});

export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;

export const evaluateResponseSchema = z.object({ critique: critiqueSchema });
export type EvaluateResponse = z.infer<typeof evaluateResponseSchema>;

/**
 * Every non-2xx response from our API uses this shape. `message` is safe to show to
 * the player; `code` is what the UI branches on.
 */
export const apiErrorSchema = z.object({
	code: z.enum([
		'invalid_request',
		'generation_failed',
		'evaluation_failed',
		'sidecar_unavailable',
		'timeout',
		'internal'
	]),
	message: z.string().min(1)
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorCode = ApiError['code'];

/* -------------------------------------------------------------------------- */
/* Provider interfaces                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Turns a fully-modified prompt into an image. Implemented by the deterministic mock
 * and by the OpenVINO sidecar client; the API routes depend only on this interface,
 * which is what lets the entire game run and be tested with no models installed.
 */
export interface ImageGenerator {
	readonly name: 'mock' | 'sidecar';
	generate(input: { prompt: string; seed?: number; signal?: AbortSignal }): Promise<Artwork>;
	/** Cheap liveness probe used by the health endpoint and provider fallback. */
	isAvailable(): Promise<boolean>;
}

/**
 * Judges a finished artwork against its brief. The sidecar implementation shows the
 * image to a vision model, so the critique reflects the actual picture rather than
 * mere keyword overlap.
 */
export interface ArtCritic {
	readonly name: 'mock' | 'sidecar';
	evaluate(input: {
		brief: ClientBrief;
		playerPrompt: string;
		imageUrl: string;
		signal?: AbortSignal;
	}): Promise<Critique>;
	isAvailable(): Promise<boolean>;
}
