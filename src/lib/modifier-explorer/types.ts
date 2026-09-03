/** Engine IDs used by the modifier explorer — isolated from game engine selection. */
export type ExplorerEngineId = 'janus-webgpu' | 'sdturbo-webgpu';

/**
 * The four independently-leveled prompt axes. Each axis runs 1 (novice) → 5 (expert)
 * so any two images can be compared "beginner through to expert" on that one dimension
 * while the others stay fixed.
 */
export type AxisId = 'style' | 'subject' | 'lighting' | 'detail';

/** 1 = novice … 5 = expert. Shared across every leveled axis. */
export type AxisLevel = 1 | 2 | 3 | 4 | 5;

export const AXIS_LEVEL_LABELS: Record<AxisLevel, string> = {
	1: 'Novice',
	2: 'Beginner',
	3: 'Intermediate',
	4: 'Advanced',
	5: 'Expert'
};

export const AXIS_DEFS: readonly { id: AxisId; label: string; description: string }[] = [
	{ id: 'style', label: 'Art style', description: 'Rendering medium — crayon → oil painting.' },
	{
		id: 'subject',
		label: 'Subject complexity',
		description: 'Geometric object → dynamic human action.'
	},
	{ id: 'lighting', label: 'Lighting', description: 'Flat light → complex cinematic lighting.' },
	{ id: 'detail', label: 'Fine detail', description: 'Splotchy rough edges → 8K micro-detail.' }
];

/** One concrete option picked for a given axis on a given prompt case. */
export interface AxisFacet {
	/** Stable short key, e.g. "oil" / "crayon". Used for exact filtering and unlock mining. */
	key: string;
	/** Short human label used on chips, e.g. "Oil" or "Crayon". */
	label: string;
	/** Where this option sits on its axis, 1 (novice) → 5 (expert). */
	level: AxisLevel;
}

/** Unleveled flavor facet — still generation-derived, just not part of the skill spectrum. */
export interface FlavorFacet {
	key: string;
	label: string;
}

/** Exact record of what was used to build a prompt — the single source of truth for tags. */
export interface PromptFacets {
	style: AxisFacet;
	subject: AxisFacet;
	lighting: AxisFacet;
	detail: AxisFacet;
	mood: FlavorFacet;
	tech?: FlavorFacet;
}

export type ModifierCategory =
	'axis-style' | 'axis-subject' | 'axis-lighting' | 'axis-detail' | 'formula-mix' | 'formula-tech';

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
	/** Model inference time reported by the engine worker. */
	generationMs: number;
	/** Time to encode PNG and persist to disk. */
	saveMs?: number;
	/** Wall-clock time for the full generate-and-save cycle. */
	totalMs?: number;
	generatedAt: string;
	seed?: number;
	/**
	 * Prompt-facet tags the user marked as good on this image.
	 * Keys look like `style:crayon`, `lighting:chiaroscuro`, `mood:serene`.
	 */
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
	/** Most recent image inference time. */
	lastGenerationMs: number | null;
	/** Rolling average inference time for the current batch. */
	averageGenerationMs: number | null;
	/** Wall-clock elapsed since the batch started. */
	elapsedMs: number;
}
