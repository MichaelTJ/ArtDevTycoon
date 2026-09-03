/** Engine IDs used by explorer2 — isolated from game engine selection. */
export type ExplorerEngineId = 'janus-webgpu' | 'sdturbo-webgpu';

/** Fresh test series. Round 1–7 plus custom prompts. */
export type ModifierCategory =
	| 'round1-objects'
	| 'round2-simple'
	| 'round3-sketch-tiers'
	| 'round4-art-tiers'
	| 'round5-retries'
	| 'round6-backgrounds'
	| 'round7-backgrounds'
	| 'custom';

/** How familiar / frequent the Round 1 subject is expected to be in training data. */
export type RarityBand = 'common' | 'uncommon' | 'rare' | 'very-rare';

export const RARITY_LABELS: Record<RarityBand, string> = {
	common: 'Common',
	uncommon: 'Uncommon',
	rare: 'Rare',
	'very-rare': 'Very rare'
};

export interface FlavorFacet {
	key: string;
	label: string;
}

/** Exact record of what built the prompt — source of truth for good-tags. */
export interface PromptFacets {
	/** `round1` … `round7`. */
	round: FlavorFacet;
	/** The object under test. */
	subject: FlavorFacet;
	/** Round 1 only — common → very-rare ladder. */
	rarity?: FlavorFacet;
	/** Round 2–7 — style or technique under test. */
	style?: FlavorFacet;
	/** Round 4–7 — art medium category (crayons, ink, oil, etc.). */
	medium?: FlavorFacet;
	/** Round 6–7 — studio lighting / canvas backdrop. */
	background?: FlavorFacet;
	/** Variant index within the 3-shot set (`v0`…`v2`). */
	variant: FlavorFacet;
}

export interface ExplorerPromptCase {
	id: string;
	category: ModifierCategory;
	categoryLabel: string;
	modifier: string;
	subject: string;
	prompt: string;
	facets: PromptFacets;
}

export interface ExplorerResult {
	caseId: string;
	engineId: ExplorerEngineId;
	category: ModifierCategory;
	categoryLabel: string;
	modifier: string;
	subject: string;
	prompt: string;
	facets: PromptFacets;
	imagePath: string;
	generationMs: number;
	saveMs?: number;
	totalMs?: number;
	generatedAt: string;
	seed?: number;
	/** Keys like `subject:apple`, `style:wireframe`, `rarity:common`. */
	goodTags?: string[];
}

export interface ExplorerManifest {
	version: 1;
	results: ExplorerResult[];
}

export type RunStatus = 'idle' | 'loading-engine' | 'running' | 'paused' | 'done' | 'error';

export interface RunProgress {
	status: RunStatus;
	engineId: ExplorerEngineId | null;
	current: number;
	total: number;
	currentCaseId: string | null;
	message: string;
	error: string | null;
	lastGenerationMs: number | null;
	averageGenerationMs: number | null;
	elapsedMs: number;
}
