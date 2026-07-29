/**
 * FROZEN CONTRACT — the single source of truth shared by every layer of the game.
 *
 * The UI, the domain rules and every AI engine agree on the shapes in this file. It is
 * orchestrator-owned: task agents import from it and MUST NOT edit it. A unilateral
 * change here silently breaks every other agent working in parallel, so request changes
 * in your handoff report instead.
 *
 * Anything crossing a trust boundary — a model's output, a remote API's JSON, restored
 * localStorage — is validated with the Zod schemas below rather than cast. A type
 * assertion on a language model's output is a lie we would only discover at runtime.
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
	 *
	 * These also do useful technical work. Janus-Pro-1B produces markedly better images
	 * from thorough, descriptive prompts, so a fixed descriptive suffix raises quality
	 * even as it caps the *style* at amateur.
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
	 * Concepts the critic checks against. Matching is fuzzy and lives in the domain
	 * layer, so these are plain concepts rather than regex. A vision engine turns each
	 * one into a yes/no question about the finished picture.
	 */
	preferredKeywords: z.array(z.string().min(1)).min(1)
});

export type ClientBrief = z.infer<typeof clientBriefSchema>;

/* -------------------------------------------------------------------------- */
/* Art critic evaluation                                                      */
/* -------------------------------------------------------------------------- */

const scoreSchema = z.number().int().min(1).max(LEVEL_1.maxScore);

/**
 * What an engine returns from `critique`. Deliberately excludes money and creativity.
 *
 * An engine judges the *picture* — that is the one thing a vision model can offer that
 * text analysis cannot. Creativity is a property of the player's prompt and the payout
 * is a property of the economy, so both are computed in the domain layer where the mock
 * and real engines cannot drift apart on difficulty.
 */
export const critiqueDraftSchema = z.object({
	/** A gallery title for the piece, invented by the critic. */
	title: z.string().min(1).max(120),
	/** How faithfully the artwork serves the client's brief, 1-10. */
	accuracyScore: scoreSchema,
	/** One or two sentences of in-character criticism shown to the player. */
	criticReview: z.string().min(1).max(600)
});

export type CritiqueDraft = z.infer<typeof critiqueDraftSchema>;

/** The complete verdict after the domain layer adds creativity and money. */
export const critiqueSchema = critiqueDraftSchema.extend({
	/** How imaginative and detailed the player's prompt was, 1-10. */
	creativityScore: scoreSchema,
	/** Cash awarded, already clamped to the brief's budget. */
	finalPayout: z.number().int().min(0)
});

export type Critique = z.infer<typeof critiqueSchema>;

/* -------------------------------------------------------------------------- */
/* Engines                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Engines are tiered. The manager picks the best one the device can actually run and
 * always keeps `mock` as a floor, because WebGPU is not a baseline on mobile.
 *
 * - `mock`           procedural art and text scoring; no download, works everywhere
 * - `janus-webgpu`   Janus-Pro-1B; one model does both generation and critique
 * - `sdturbo-webgpu` SD-Turbo 512px images, paired with Janus for critique; desktop
 * - `remote`         a user-supplied API endpoint; reserved for a later phase
 */
export const ENGINE_IDS = ['mock', 'janus-webgpu', 'sdturbo-webgpu', 'remote'] as const;
export type EngineId = (typeof ENGINE_IDS)[number];

export const engineIdSchema = z.enum(ENGINE_IDS);

export interface EngineRequirements {
	/** Whether the engine cannot run at all without WebGPU. */
	webgpu: boolean;
	/** Rough download size, shown to the player before they opt in. */
	approxDownloadMb: number;
	/**
	 * Minimum `maxStorageBufferBindingSize` in MB. This is the most reliable proxy the
	 * platform gives us for whether a model will fit; phones reporting 128 MB cannot
	 * run these models and will hard-crash the tab rather than fail gracefully.
	 */
	minStorageBufferMb: number;
	/** True when the engine is realistically desktop-only. */
	desktopOnly: boolean;
}

/** What a device can actually do, measured once at startup. */
export interface DeviceCapability {
	webgpu: boolean;
	/** WebGPU `shader-f16` feature. Its absence roughly doubles memory use. */
	fp16: boolean;
	maxStorageBufferBindingMb: number | null;
	maxBufferMb: number | null;
	isMobile: boolean;
	/** `navigator.deviceMemory` in GB where exposed; null on Safari and Firefox. */
	deviceMemoryGb: number | null;
}

export type EngineAvailability =
	| { available: true; requiresDownload: boolean; approxDownloadMb: number }
	| { available: false; reason: string };

/** Emitted repeatedly while an engine downloads and compiles. Drives the progress UI. */
export interface LoadProgress {
	status: 'downloading' | 'compiling' | 'ready';
	/** Current file being fetched, for the detail line under the bar. */
	file: string | null;
	loadedBytes: number;
	totalBytes: number;
	/** 0-1. Always populated, even when byte totals are unknown. */
	fraction: number;
}

export type EngineState = 'idle' | 'probing' | 'loading' | 'ready' | 'error' | 'unsupported';

/**
 * The flattened, UI-ready shape of one engine choice. `EngineStore` (spec 04) produces
 * these from `EngineManager.options` plus its own descriptors; `EnginePicker` (spec 03)
 * renders them. Naming this once here means the store and the component agree on the
 * shape without either spec having to invent or duplicate it.
 */
export interface EngineOption {
	id: EngineId;
	displayName: string;
	description: string;
	available: boolean;
	unavailableReason?: string;
	requiresDownload: boolean;
	approxDownloadMb: number;
}

/**
 * The single interface every AI backend implements. The game depends only on this,
 * which is what lets it run with no models installed, lets engines be swapped at
 * runtime, and leaves a clean seam for user-supplied APIs in a later phase.
 */
export interface ArtEngine {
	readonly id: EngineId;
	readonly displayName: string;
	/** One line shown in the engine picker. */
	readonly description: string;
	readonly requirements: EngineRequirements;
	readonly capabilities: { generate: boolean; critique: boolean };

	/** Cheap, side-effect-free check. Must not download anything. */
	probe(capability: DeviceCapability): Promise<EngineAvailability>;

	/** Download and initialise. Must be safe to call twice. */
	load(options?: {
		onProgress?: (progress: LoadProgress) => void;
		signal?: AbortSignal;
	}): Promise<void>;

	/**
	 * `playerPrompt` is exactly what the player typed and is never sent to the model —
	 * it exists only so the engine can echo it, untouched, into the returned
	 * `Artwork`. `prompt` is the real generation input, already carrying the hidden
	 * Level 1 modifiers. Keeping them separate is deliberate: an engine that only ever
	 * sees one merged string has no way to report back which part the player wrote,
	 * and the whole Level 1 joke depends on that distinction never blurring.
	 */
	generate(input: {
		playerPrompt: string;
		prompt: string;
		seed?: number;
		signal?: AbortSignal;
	}): Promise<Artwork>;

	critique(input: {
		brief: ClientBrief;
		playerPrompt: string;
		artwork: Artwork;
		signal?: AbortSignal;
	}): Promise<CritiqueDraft>;

	/** Free GPU memory. The manager calls this before loading a different engine. */
	unload(): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Artwork                                                                    */
/* -------------------------------------------------------------------------- */

export const artworkSchema = z.object({
	id: z.string().min(1),
	/** Displayable source: a `blob:` URL, a `data:` URL, or an HTTP path. */
	imageUrl: z.string().min(1),
	/**
	 * Exactly what the player typed, echoed back by the engine unchanged. Never the
	 * built prompt — if this ever equals `prompt` from a `generate()` call, the hidden
	 * modifiers have leaked and something is wrong.
	 */
	playerPrompt: z.string(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
	/** Milliseconds the model took, surfaced in the debug panel to spot slow devices. */
	generationMs: z.number().nonnegative(),
	/** Which engine produced this, so mock and real art are distinguishable. */
	engineId: engineIdSchema
});

export type Artwork = z.infer<typeof artworkSchema>;

/** A completed commission as it appears in the bottom portfolio strip. */
export const galleryEntrySchema = z.object({
	id: z.string().min(1),
	imageUrl: z.string().min(1),
	title: z.string().min(1),
	payout: z.number().int().min(0),
	/** Mean of accuracy and creativity — the single headline number. */
	score: z.number().min(0).max(LEVEL_1.maxScore),
	clientName: z.string().min(1),
	/**
	 * The brief's `id` (e.g. `'c1'`), not just its display name. `inviteClient()` needs
	 * this to exclude already-served clients — matching on `clientName` would be
	 * fragile the moment two briefs ever share a display name.
	 */
	briefId: z.string().min(1),
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
	| 'generating' // the engine is painting
	| 'critiquing' // the artwork exists; the critic is judging it
	| 'results' // artwork and critique ready, awaiting "Collect Cash"
	| 'failed' // generation or critique failed; player may retry
	| 'levelComplete'; // win condition met

export interface GameState {
	phase: GamePhase;
	cash: number;
	/**
	 * Tracked from Level 1 onward but deliberately unused by any win condition or UI
	 * in this level — it exists so `reputationGain` has somewhere to accumulate ahead
	 * of Level 2, where it is expected to unlock better clients. Do not surface it or
	 * gate anything on it in Level 1; that is out of scope here.
	 */
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
/* Worker protocol                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Messages between the page and an inference Web Worker. Inference must never run on
 * the main thread — a 1B model would freeze the UI for the whole generation, and on
 * mobile the browser would kill the tab.
 *
 * Every request carries an `id` so concurrent replies can be matched to their caller.
 */
export type WorkerRequest =
	| { type: 'load'; id: string; engineId: EngineId }
	| { type: 'generate'; id: string; prompt: string; seed?: number }
	| {
			type: 'critique';
			id: string;
			questions: string[];
			reviewPrompt: string;
			imageBitmap: ImageBitmap;
	  }
	| { type: 'unload'; id: string }
	| { type: 'cancel'; id: string };

export type WorkerResponse =
	| { type: 'progress'; id: string; progress: LoadProgress }
	| { type: 'loaded'; id: string }
	| { type: 'generated'; id: string; imageBitmap: ImageBitmap; generationMs: number }
	| { type: 'critiqued'; id: string; answers: string[]; review: string }
	| { type: 'unloaded'; id: string }
	| { type: 'error'; id: string; message: string; code: EngineErrorCode };

export const ENGINE_ERROR_CODES = [
	'webgpu_unavailable',
	'out_of_memory',
	'download_failed',
	'generation_failed',
	'critique_failed',
	'cancelled',
	'internal'
] as const;

export type EngineErrorCode = (typeof ENGINE_ERROR_CODES)[number];
