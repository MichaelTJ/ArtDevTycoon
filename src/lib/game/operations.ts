import {
	LEVEL_1,
	type ClientBrief,
	type EngineState,
	type GalleryEntry,
	type GamePhase
} from '$lib/types/contracts';
import { isLevelComplete, levelProgress } from './levelRules';

/** How urgently the studio needs player attention. */
export type OperationalUrgency = 'critical' | 'attention' | 'info';

/** One actionable or informational studio need surfaced to the player. */
export interface OperationalNeed {
	id: string;
	urgency: OperationalUrgency;
	title: string;
	detail: string;
}

/** Preset filters for completed commission records. */
export type GalleryFilter = 'all' | 'low-score' | 'high-payout' | 'recent';

/** Player-controlled search and filter state for the operations view. */
export interface OperationsQuery {
	search: string;
	filter: GalleryFilter;
}

/** Headline studio metrics derived from live game state. */
export interface OperationsSummary {
	cash: number;
	cashTarget: number;
	cashRemaining: number;
	commissionsCompleted: number;
	commissionsTarget: number;
	commissionsRemaining: number;
	overallProgress: number;
	totalEarnings: number;
	averageScore: number | null;
	completedCount: number;
	headline: string;
}

/** Everything the operations panel needs to render in one pass. */
export interface OperationalSnapshot {
	needs: OperationalNeed[];
	summary: OperationsSummary;
	filteredEntries: GalleryEntry[];
	totalMatching: number;
}

/** Inputs required to build an operational snapshot from current play state. */
export interface OperationsInput {
	phase: GamePhase;
	cash: number;
	commissionsCompleted: number;
	galleryHistory: GalleryEntry[];
	errorMessage: string | null;
	currentClient: ClientBrief | null;
	engineLoadError?: string | null;
	engineState?: EngineState;
	query: OperationsQuery;
}

const RECENT_LIMIT = 3;
const LOW_SCORE_THRESHOLD = 5;
const HIGH_PAYOUT_THRESHOLD = 100;

function normalizeSearch(value: string): string {
	return value.trim().toLowerCase();
}

function matchesSearch(entry: GalleryEntry, search: string): boolean {
	if (search.length === 0) {
		return true;
	}

	const haystack = `${entry.title} ${entry.clientName}`.toLowerCase();
	return haystack.includes(search);
}

function matchesFilter(entry: GalleryEntry, filter: GalleryFilter, index: number): boolean {
	switch (filter) {
		case 'all':
			return true;
		case 'low-score':
			return entry.score < LOW_SCORE_THRESHOLD;
		case 'high-payout':
			return entry.payout >= HIGH_PAYOUT_THRESHOLD;
		case 'recent':
			return index < RECENT_LIMIT;
	}
}

/**
 * Filters gallery history by the player's search text and preset filter. Entries stay
 * newest-first; the recent filter keeps the first three after search narrowing.
 */
export function filterGalleryEntries(
	entries: readonly GalleryEntry[],
	query: OperationsQuery
): { filtered: GalleryEntry[]; totalMatching: number } {
	const search = normalizeSearch(query.search);
	const searched = entries.filter((entry) => matchesSearch(entry, search));
	const filtered = searched.filter((entry, index) => matchesFilter(entry, query.filter, index));

	return { filtered, totalMatching: filtered.length };
}

/** Surfaces unresolved failures, waiting clients, and win-condition gaps. */
export function identifyOperationalNeeds(input: Omit<OperationsInput, 'query'>): OperationalNeed[] {
	const needs: OperationalNeed[] = [];
	const progress = levelProgress({
		cash: input.cash,
		commissionsCompleted: input.commissionsCompleted
	});

	if (input.engineLoadError) {
		needs.push({
			id: 'engine-error',
			urgency: 'critical',
			title: 'AI engine failed to load',
			detail: input.engineLoadError
		});
	} else if (input.engineState === 'error') {
		needs.push({
			id: 'engine-state-error',
			urgency: 'critical',
			title: 'AI engine is unavailable',
			detail: 'Switch back to Crayon Mode or retry loading from the engine menu.'
		});
	}

	if (input.phase === 'failed' && input.errorMessage) {
		needs.push({
			id: 'commission-failed',
			urgency: 'critical',
			title: 'Last commission failed',
			detail: input.errorMessage
		});
	}

	if (input.phase === 'results') {
		needs.push({
			id: 'collect-cash',
			urgency: 'attention',
			title: 'Payment waiting',
			detail: 'Collect cash from the finished commission before inviting the next client.'
		});
	}

	if (input.phase === 'briefing' && input.currentClient) {
		needs.push({
			id: 'client-waiting',
			urgency: 'attention',
			title: `${input.currentClient.clientName} is waiting`,
			detail: 'Write a prompt and create art to fulfil the brief.'
		});
	}

	if (!isLevelComplete({ cash: input.cash, commissionsCompleted: input.commissionsCompleted })) {
		const cashRemaining = Math.max(0, LEVEL_1.targetCash - input.cash);
		const commissionsRemaining = Math.max(
			0,
			LEVEL_1.targetCommissions - input.commissionsCompleted
		);

		if (cashRemaining > 0) {
			needs.push({
				id: 'cash-gap',
				urgency: progress.overall < 0.5 ? 'attention' : 'info',
				title: `$${cashRemaining} still needed`,
				detail: `Bank $${LEVEL_1.targetCash} to unlock the commercial gallery.`
			});
		}

		if (commissionsRemaining > 0) {
			needs.push({
				id: 'commissions-gap',
				urgency: progress.overall < 0.5 ? 'attention' : 'info',
				title: `${commissionsRemaining} commission${commissionsRemaining === 1 ? '' : 's'} remaining`,
				detail: `Complete ${LEVEL_1.targetCommissions} commissions to finish Level 1.`
			});
		}
	}

	return needs;
}

/** Builds readable summary text and headline figures for the studio dashboard. */
export function buildOperationsSummary(input: Omit<OperationsInput, 'query'>): OperationsSummary {
	const progress = levelProgress({
		cash: input.cash,
		commissionsCompleted: input.commissionsCompleted
	});
	const totalEarnings = input.galleryHistory.reduce((sum, entry) => sum + entry.payout, 0);
	const completedCount = input.galleryHistory.length;
	const averageScore =
		completedCount === 0
			? null
			: Math.round(
					(input.galleryHistory.reduce((sum, entry) => sum + entry.score, 0) / completedCount) * 10
				) / 10;

	const cashRemaining = Math.max(0, LEVEL_1.targetCash - input.cash);
	const commissionsRemaining = Math.max(0, LEVEL_1.targetCommissions - input.commissionsCompleted);

	let headline: string;
	if (isLevelComplete({ cash: input.cash, commissionsCompleted: input.commissionsCompleted })) {
		headline = 'Level 1 complete — the commercial gallery awaits.';
	} else if (input.phase === 'failed') {
		headline = 'Resolve the failed commission before continuing.';
	} else if (input.phase === 'results') {
		headline = 'A finished piece is ready to collect.';
	} else if (completedCount === 0) {
		headline = 'No completed commissions yet — invite your first client.';
	} else {
		headline = `${completedCount} piece${completedCount === 1 ? '' : 's'} in the portfolio; ${Math.round(progress.overall * 100)}% toward Level 1.`;
	}

	return {
		cash: input.cash,
		cashTarget: LEVEL_1.targetCash,
		cashRemaining,
		commissionsCompleted: input.commissionsCompleted,
		commissionsTarget: LEVEL_1.targetCommissions,
		commissionsRemaining,
		overallProgress: progress.overall,
		totalEarnings,
		averageScore,
		completedCount,
		headline
	};
}

/** Combines search/filter, urgency detection, and summary metrics for the UI layer. */
export function buildOperationalSnapshot(input: OperationsInput): OperationalSnapshot {
	const { filtered, totalMatching } = filterGalleryEntries(input.galleryHistory, input.query);

	return {
		needs: identifyOperationalNeeds(input),
		summary: buildOperationsSummary(input),
		filteredEntries: filtered,
		totalMatching
	};
}
