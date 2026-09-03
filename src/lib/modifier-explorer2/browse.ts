import { EXPLORER_CATEGORY_LABELS, ROUND6_BACKGROUNDS, ROUND7_BACKGROUNDS } from './prompts';
import type {
	ExplorerEngineId,
	ExplorerResult,
	ModifierCategory,
	PromptFacets,
	RarityBand
} from './types';

export type BrowseGroupBy = 'none' | 'rarity' | 'subject' | 'style' | 'background' | 'category';

export type GenerationTagKind =
	'round' | 'subject' | 'rarity' | 'style' | 'medium' | 'background' | 'variant';

export interface GenerationTag {
	kind: GenerationTagKind;
	id: string;
	label: string;
}

export interface GenerationTagSummary {
	kind: GenerationTagKind;
	id: string;
	label: string;
	count: number;
}

export interface BrowseQuery {
	text: string;
	engine: ExplorerEngineId | 'all';
	category: ModifierCategory | 'all';
	pickFilter: 'all' | 'picked' | 'unpicked';
	subjects: string[];
	rarities: string[];
	styles: string[];
}

export interface BrowseFacetOption {
	id: string;
	label: string;
	count: number;
}

export interface BrowseGroup {
	id: string;
	label: string;
	results: ExplorerResult[];
}

export interface TaggedResult {
	result: ExplorerResult;
	haystack: string;
}

export const EMPTY_BROWSE_QUERY: BrowseQuery = {
	text: '',
	engine: 'all',
	category: 'all',
	pickFilter: 'all',
	subjects: [],
	rarities: [],
	styles: []
};

export interface BrowsePreset {
	id: string;
	label: string;
	description: string;
	apply: Partial<BrowseQuery>;
	groupBy: BrowseGroupBy;
}

export const BROWSE_PRESETS: readonly BrowsePreset[] = [
	{
		id: 'round1',
		label: 'Round 1 · objects',
		description: 'Object recognition battery, grouped by rarity.',
		apply: { category: 'round1-objects', subjects: [], rarities: [], styles: [], text: '' },
		groupBy: 'rarity'
	},
	{
		id: 'round2',
		label: 'Round 2 · style modifiers',
		description: 'Style prefix modifiers on working objects.',
		apply: { category: 'round2-simple', subjects: [], rarities: [], styles: [], text: '' },
		groupBy: 'style'
	},
	{
		id: 'round3',
		label: 'Round 3 · sketch tiers',
		description: 'Basic → advanced sketch styles, 5 objects each.',
		apply: { category: 'round3-sketch-tiers', subjects: [], rarities: [], styles: [], text: '' },
		groupBy: 'style'
	},
	{
		id: 'round4',
		label: 'Round 4 · art medium tiers',
		description: 'Six art-medium categories, seven tiers each, 5 objects per tier.',
		apply: { category: 'round4-art-tiers', subjects: [], rarities: [], styles: [], text: '' },
		groupBy: 'style'
	},
	{
		id: 'round5',
		label: 'Round 5 · failed-tier retries',
		description: 'Replacement suffixes for the six Round 4 styles Janus failed.',
		apply: { category: 'round5-retries', subjects: [], rarities: [], styles: [], text: '' },
		groupBy: 'style'
	},
	{
		id: 'round6',
		label: 'Round 6 · background tiers',
		description: 'One shot per medium × skill tier, backdrop matched to that rank.',
		apply: { category: 'round6-backgrounds', subjects: [], rarities: [], styles: [], text: '' },
		groupBy: 'background'
	},
	{
		id: 'round7',
		label: 'Round 7 · background tiers v2',
		description: 'Refined studio progression — flat canvas through three-point lighting.',
		apply: { category: 'round7-backgrounds', subjects: [], rarities: [], styles: [], text: '' },
		groupBy: 'background'
	},
	{
		id: 'custom-only',
		label: 'Custom prompts',
		description: 'One-off typed prompts.',
		apply: { category: 'custom', subjects: [], rarities: [], styles: [], text: '' },
		groupBy: 'category'
	},
	{
		id: 'common-only',
		label: 'Common objects',
		description: 'Round 1 common band only.',
		apply: {
			category: 'round1-objects',
			rarities: ['common'],
			subjects: [],
			styles: [],
			text: ''
		},
		groupBy: 'subject'
	},
	{
		id: 'very-rare-only',
		label: 'Very rare objects',
		description: 'Round 1 very-rare band — stress test.',
		apply: {
			category: 'round1-objects',
			rarities: ['very-rare'],
			subjects: [],
			styles: [],
			text: ''
		},
		groupBy: 'subject'
	}
];

export function applyBrowsePreset(query: BrowseQuery, preset: BrowsePreset): BrowseQuery {
	return { ...query, ...EMPTY_BROWSE_QUERY, ...preset.apply, engine: query.engine };
}

function facetsHaystack(f: PromptFacets): string {
	return [
		f.round.label,
		f.subject.label,
		f.rarity?.label ?? '',
		f.style?.label ?? '',
		f.medium?.label ?? '',
		f.background?.label ?? '',
		f.variant.label
	].join(' ');
}

export function tagResult(result: ExplorerResult): TaggedResult {
	const haystack =
		`${result.prompt} ${result.modifier} ${result.subject} ${result.categoryLabel} ${result.caseId} ${facetsHaystack(result.facets)}`.toLowerCase();
	return { result, haystack };
}

export function tagResults(results: readonly ExplorerResult[]): TaggedResult[] {
	return results.map(tagResult);
}

function hasAny(required: string[], actual: string | undefined): boolean {
	if (required.length === 0) return true;
	if (!actual) return false;
	return required.includes(actual);
}

export function filterTaggedResults(
	tagged: readonly TaggedResult[],
	query: BrowseQuery,
	hasGoodMark: (result: ExplorerResult) => boolean
): TaggedResult[] {
	const needle = query.text.trim().toLowerCase();

	return tagged.filter(({ result, haystack }) => {
		if (query.engine !== 'all' && result.engineId !== query.engine) return false;
		if (query.category !== 'all' && result.category !== query.category) return false;
		if (query.pickFilter === 'picked' && !hasGoodMark(result)) return false;
		if (query.pickFilter === 'unpicked' && hasGoodMark(result)) return false;
		if (needle && !haystack.includes(needle)) return false;
		if (!hasAny(query.subjects, result.facets.subject.key)) return false;
		if (!hasAny(query.rarities, result.facets.rarity?.key)) return false;
		if (!hasAny(query.styles, result.facets.style?.key)) return false;
		return true;
	});
}

export function listGenerationTags(result: ExplorerResult): GenerationTag[] {
	const f = result.facets;
	const chips: GenerationTag[] = [
		{ kind: 'round', id: f.round.key, label: f.round.label },
		{ kind: 'subject', id: f.subject.key, label: f.subject.label }
	];
	if (f.rarity) chips.push({ kind: 'rarity', id: f.rarity.key, label: f.rarity.label });
	if (f.medium) chips.push({ kind: 'medium', id: f.medium.key, label: f.medium.label });
	if (f.style) chips.push({ kind: 'style', id: f.style.key, label: f.style.label });
	if (f.background)
		chips.push({ kind: 'background', id: f.background.key, label: f.background.label });
	chips.push({ kind: 'variant', id: f.variant.key, label: f.variant.label });
	return chips;
}

export function isGenerationTagActive(query: BrowseQuery, tag: GenerationTag): boolean {
	if (tag.kind === 'subject') return query.subjects.includes(tag.id);
	if (tag.kind === 'rarity') return query.rarities.includes(tag.id);
	if (tag.kind === 'style') return query.styles.includes(tag.id);
	return false;
}

function toggleValue(values: string[], id: string): string[] {
	return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

export function toggleGenerationTagInQuery(query: BrowseQuery, tag: GenerationTag): BrowseQuery {
	if (tag.kind === 'subject') return { ...query, subjects: toggleValue(query.subjects, tag.id) };
	if (tag.kind === 'rarity') return { ...query, rarities: toggleValue(query.rarities, tag.id) };
	if (tag.kind === 'style') return { ...query, styles: toggleValue(query.styles, tag.id) };
	return query;
}

export function summarizeGoodPromptTags(
	results: readonly ExplorerResult[]
): GenerationTagSummary[] {
	const counts = new Map<string, GenerationTagSummary>();

	for (const result of results) {
		const good = new Set(result.goodTags ?? []);
		if (good.size === 0) continue;
		for (const tag of listGenerationTags(result)) {
			const key = `${tag.kind}:${tag.id}`;
			if (!good.has(key)) continue;
			const existing = counts.get(key);
			if (existing) existing.count += 1;
			else counts.set(key, { kind: tag.kind, id: tag.id, label: tag.label, count: 1 });
		}
	}

	return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const RARITY_ORDER: RarityBand[] = ['common', 'uncommon', 'rare', 'very-rare'];

export function groupTaggedResults(
	tagged: readonly TaggedResult[],
	groupBy: BrowseGroupBy
): BrowseGroup[] {
	if (groupBy === 'none') {
		return [{ id: 'all', label: 'All', results: tagged.map((t) => t.result) }];
	}

	const buckets = new Map<string, ExplorerResult[]>();
	const labels = new Map<string, string>();

	for (const { result } of tagged) {
		let id: string;
		let label: string;
		if (groupBy === 'rarity') {
			id = result.facets.rarity?.key ?? 'none';
			label = result.facets.rarity?.label ?? 'No rarity';
		} else if (groupBy === 'subject') {
			id = result.facets.subject.key;
			label = result.facets.subject.label;
		} else if (groupBy === 'style') {
			id = result.facets.style?.key ?? 'none';
			label = result.facets.style?.label ?? 'No style';
		} else if (groupBy === 'background') {
			id = result.facets.background?.key ?? 'none';
			label = result.facets.background?.label ?? 'No background';
		} else {
			id = result.category;
			label = EXPLORER_CATEGORY_LABELS[result.category];
		}
		labels.set(id, label);
		const list = buckets.get(id) ?? [];
		list.push(result);
		buckets.set(id, list);
	}

	const ids = [...buckets.keys()];
	if (groupBy === 'rarity') {
		ids.sort((a, b) => {
			const ai = RARITY_ORDER.indexOf(a as RarityBand);
			const bi = RARITY_ORDER.indexOf(b as RarityBand);
			return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
		});
	} else if (groupBy === 'background') {
		const order = [...ROUND6_BACKGROUNDS, ...ROUND7_BACKGROUNDS].map((bg) => bg.key);
		ids.sort((a, b) => {
			const ai = order.indexOf(a);
			const bi = order.indexOf(b);
			return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
		});
	} else {
		ids.sort((a, b) => (labels.get(a) ?? a).localeCompare(labels.get(b) ?? b));
	}

	return ids.map((id) => ({
		id,
		label: labels.get(id) ?? id,
		results: buckets.get(id) ?? []
	}));
}

function collectCounts(
	tagged: readonly TaggedResult[],
	pick: (facets: PromptFacets) => { key: string; label: string } | undefined
): BrowseFacetOption[] {
	const counts = new Map<string, BrowseFacetOption>();
	for (const { result } of tagged) {
		const facet = pick(result.facets);
		if (!facet) continue;
		const existing = counts.get(facet.key);
		if (existing) existing.count += 1;
		else counts.set(facet.key, { id: facet.key, label: facet.label, count: 1 });
	}
	return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function collectSubjectOptions(tagged: readonly TaggedResult[]): BrowseFacetOption[] {
	return collectCounts(tagged, (f) => f.subject);
}

export function collectRarityOptions(tagged: readonly TaggedResult[]): BrowseFacetOption[] {
	return collectCounts(tagged, (f) => f.rarity);
}

export function collectStyleOptions(tagged: readonly TaggedResult[]): BrowseFacetOption[] {
	return collectCounts(tagged, (f) => f.style);
}
