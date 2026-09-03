import { AXIS_DEFS, AXIS_LEVEL_LABELS } from './types';
import type {
	AxisId,
	AxisLevel,
	ExplorerEngineId,
	ExplorerResult,
	ModifierCategory
} from './types';

export type BrowseGroupBy =
	| 'none'
	| 'style-level'
	| 'subject-level'
	| 'lighting-level'
	| 'detail-level'
	| 'style'
	| 'subject'
	| 'lighting'
	| 'detail'
	| 'mood';

export interface BrowseQuery {
	text: string;
	engine: ExplorerEngineId | 'all';
	category: ModifierCategory | 'all';
	pickFilter: 'all' | 'picked' | 'unpicked';
	/** Selected exact option keys per axis, e.g. keys.style = ['oil']. */
	keys: Record<AxisId, string[]>;
	/** Selected difficulty levels per axis, e.g. levels.lighting = [5]. */
	levels: Record<AxisId, AxisLevel[]>;
	moods: string[];
}

export type GenerationTagKind = AxisId | 'mood' | 'tech';

/** A prompt facet actually used to generate the image — shown on cards and used as filters. */
export interface GenerationTag {
	kind: GenerationTagKind;
	id: string;
	label: string;
	level?: AxisLevel;
}

export interface GenerationTagSummary {
	kind: GenerationTagKind;
	id: string;
	label: string;
	count: number;
}

export interface BrowsePreset {
	id: string;
	label: string;
	description: string;
	apply: Partial<Pick<BrowseQuery, 'keys' | 'levels' | 'moods' | 'text' | 'category'>>;
	groupBy: BrowseGroupBy;
}

export interface BrowseFacetOption {
	id: string;
	label: string;
	count: number;
	level?: AxisLevel;
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

function emptyKeys(): Record<AxisId, string[]> {
	return { style: [], subject: [], lighting: [], detail: [] };
}

function emptyLevels(): Record<AxisId, AxisLevel[]> {
	return { style: [], subject: [], lighting: [], detail: [] };
}

export const EMPTY_BROWSE_QUERY: BrowseQuery = {
	text: '',
	engine: 'all',
	category: 'all',
	pickFilter: 'all',
	keys: emptyKeys(),
	levels: emptyLevels(),
	moods: []
};

function axisLabel(axis: AxisId): string {
	return AXIS_DEFS.find((def) => def.id === axis)?.label ?? axis;
}

/** Curated compare views matching common analysis questions. */
export const BROWSE_PRESETS: readonly BrowsePreset[] = [
	{
		id: 'style-spectrum',
		label: 'Style · crayon → oil',
		description: 'Every art-style option, grouped novice → expert.',
		apply: { category: 'axis-style', keys: emptyKeys(), levels: emptyLevels(), text: '' },
		groupBy: 'style-level'
	},
	{
		id: 'subject-spectrum',
		label: 'Subject · object → action',
		description: 'Subject complexity, grouped novice → expert.',
		apply: { category: 'axis-subject', keys: emptyKeys(), levels: emptyLevels(), text: '' },
		groupBy: 'subject-level'
	},
	{
		id: 'lighting-spectrum',
		label: 'Lighting · flat → cinematic',
		description: 'Lighting complexity, grouped novice → expert.',
		apply: { category: 'axis-lighting', keys: emptyKeys(), levels: emptyLevels(), text: '' },
		groupBy: 'lighting-level'
	},
	{
		id: 'detail-spectrum',
		label: 'Detail · splotchy → 8K',
		description: 'Fine-detail rendering, grouped novice → expert.',
		apply: { category: 'axis-detail', keys: emptyKeys(), levels: emptyLevels(), text: '' },
		groupBy: 'detail-level'
	},
	{
		id: 'all-novice',
		label: 'All novice (Level 1)',
		description: 'Every image where every axis is at its crudest level.',
		apply: {
			category: 'all',
			keys: emptyKeys(),
			levels: { style: [1], subject: [1], lighting: [1], detail: [1] },
			text: ''
		},
		groupBy: 'style'
	},
	{
		id: 'all-expert',
		label: 'All expert (Level 5)',
		description: 'Every image where every axis is at its most advanced level.',
		apply: {
			category: 'all',
			keys: emptyKeys(),
			levels: { style: [5], subject: [5], lighting: [5], detail: [5] },
			text: ''
		},
		groupBy: 'style'
	},
	{
		id: 'oil-all',
		label: 'All oil paintings',
		description: 'Every oil-painting styled result, across subjects.',
		apply: {
			category: 'all',
			keys: { ...emptyKeys(), style: ['oil'] },
			levels: emptyLevels(),
			text: ''
		},
		groupBy: 'subject'
	},
	{
		id: 'crayon-all',
		label: 'All crayon (unlock)',
		description: 'Crayon medium unlock tag across subjects — Level 1 comedy baseline.',
		apply: {
			category: 'all',
			keys: { ...emptyKeys(), style: ['crayon'] },
			levels: emptyLevels(),
			text: ''
		},
		groupBy: 'subject'
	},
	{
		id: 'pencil-all',
		label: 'All pencil (unlock)',
		description: 'Pencil medium unlock tag across subjects.',
		apply: {
			category: 'all',
			keys: { ...emptyKeys(), style: ['pencil'] },
			levels: emptyLevels(),
			text: ''
		},
		groupBy: 'subject'
	},
	{
		id: 'ink-all',
		label: 'All ink (unlock)',
		description: 'Ink medium unlock tag across subjects.',
		apply: {
			category: 'all',
			keys: { ...emptyKeys(), style: ['ink'] },
			levels: emptyLevels(),
			text: ''
		},
		groupBy: 'subject'
	},
	{
		id: 'watercolor-all',
		label: 'All watercolour (unlock)',
		description: 'Watercolour medium unlock tag across subjects.',
		apply: {
			category: 'all',
			keys: { ...emptyKeys(), style: ['watercolor'] },
			levels: emptyLevels(),
			text: ''
		},
		groupBy: 'subject'
	},
	{
		id: 'acrylic-all',
		label: 'All acrylic (unlock)',
		description: 'Acrylic medium unlock tag across subjects.',
		apply: {
			category: 'all',
			keys: { ...emptyKeys(), style: ['acrylic'] },
			levels: emptyLevels(),
			text: ''
		},
		groupBy: 'subject'
	},
	{
		id: 'fox-styles',
		label: 'Fox · all styles',
		description: 'The resting-fox subject across every art style.',
		apply: {
			category: 'all',
			keys: { ...emptyKeys(), subject: ['fox'] },
			levels: emptyLevels(),
			text: ''
		},
		groupBy: 'style'
	},
	{
		id: 'cat-styles',
		label: 'Cat · all styles',
		description: 'Sleeping / sitting cats across every art style (Janus stress case).',
		apply: {
			category: 'all',
			keys: { ...emptyKeys(), subject: ['cat', 'housecat'] },
			levels: emptyLevels(),
			text: ''
		},
		groupBy: 'style'
	}
];

export function tagResult(result: ExplorerResult): TaggedResult {
	const f = result.facets;
	const haystack =
		`${result.prompt} ${result.modifier} ${result.subject} ${result.categoryLabel} ${result.caseId} ${
			f
				? `${f.style.label} ${f.subject.label} ${f.lighting.label} ${f.detail.label} ${f.mood.label}`
				: ''
		}`.toLowerCase();
	return { result, haystack };
}

export function tagResults(results: readonly ExplorerResult[]): TaggedResult[] {
	return results.map(tagResult);
}

function hasAny(required: string[], actual: string): boolean {
	if (required.length === 0) return true;
	return required.includes(actual);
}

function hasAnyLevel(required: AxisLevel[], actual: AxisLevel): boolean {
	if (required.length === 0) return true;
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
		if (!result.facets) return needle.length === 0 && query.category === 'all';

		for (const axis of ['style', 'subject', 'lighting', 'detail'] as const) {
			if (!hasAny(query.keys[axis], result.facets[axis].key)) return false;
			if (!hasAnyLevel(query.levels[axis], result.facets[axis].level)) return false;
		}
		if (!hasAny(query.moods, result.facets.mood.key)) return false;
		return true;
	});
}

/** Flatten the exact generation facets into clickable prompt-tags for a card. */
export function listGenerationTags(result: ExplorerResult): GenerationTag[] {
	const f = result.facets;
	if (!f) return [];
	const chips: GenerationTag[] = [
		{
			kind: 'style',
			id: f.style.key,
			label: f.style.label.replace(/^an?\s+/i, ''),
			level: f.style.level
		},
		{
			kind: 'subject',
			id: f.subject.key,
			label: f.subject.label,
			level: f.subject.level
		},
		{
			kind: 'lighting',
			id: f.lighting.key,
			label: f.lighting.label.replace(/^an?\s+/i, ''),
			level: f.lighting.level
		},
		{
			kind: 'detail',
			id: f.detail.key,
			label: f.detail.label,
			level: f.detail.level
		},
		{ kind: 'mood', id: f.mood.key, label: f.mood.label.replace(/^an?\s+/i, '') }
	];
	if (f.tech) {
		chips.push({ kind: 'tech', id: f.tech.key, label: f.tech.label });
	}
	return chips;
}

export function isGenerationTagActive(query: BrowseQuery, tag: GenerationTag): boolean {
	if (tag.kind === 'mood') return query.moods.includes(tag.id);
	if (tag.kind === 'tech') return false;
	return query.keys[tag.kind].includes(tag.id);
}

function toggleValue(values: string[], id: string): string[] {
	return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

export function toggleGenerationTagInQuery(query: BrowseQuery, tag: GenerationTag): BrowseQuery {
	if (tag.kind === 'mood') {
		return { ...query, moods: toggleValue(query.moods, tag.id) };
	}
	if (tag.kind === 'tech') return query;
	return {
		...query,
		keys: { ...query.keys, [tag.kind]: toggleValue(query.keys[tag.kind], tag.id) }
	};
}

export function toggleAxisLevel(query: BrowseQuery, axis: AxisId, level: AxisLevel): BrowseQuery {
	const current = query.levels[axis];
	const next = current.includes(level) ? current.filter((l) => l !== level) : [...current, level];
	return { ...query, levels: { ...query.levels, [axis]: next } };
}

/** Among images with at least one good prompt-tag, count how often each tag was marked good. */
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

export function collectFacetOptions(
	tagged: readonly TaggedResult[],
	kind: AxisId
): BrowseFacetOption[] {
	const counts = new Map<string, { label: string; level: AxisLevel; count: number }>();

	for (const { result } of tagged) {
		if (!result.facets) continue;
		const facet = result.facets[kind];
		const existing = counts.get(facet.key);
		if (existing) existing.count += 1;
		else counts.set(facet.key, { label: facet.label, level: facet.level, count: 1 });
	}

	return [...counts.entries()]
		.map(([id, value]) => ({ id, label: value.label, count: value.count, level: value.level }))
		.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label));
}

export function collectMoodOptions(tagged: readonly TaggedResult[]): BrowseFacetOption[] {
	const counts = new Map<string, { label: string; count: number }>();
	for (const { result } of tagged) {
		if (!result.facets) continue;
		const { key, label } = result.facets.mood;
		const existing = counts.get(key);
		if (existing) existing.count += 1;
		else counts.set(key, { label, count: 1 });
	}
	return [...counts.entries()]
		.map(([id, value]) => ({ id, label: value.label, count: value.count }))
		.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Level-only facet chips for a given axis — "beginner → expert" regardless of exact option. */
export function collectLevelOptions(
	tagged: readonly TaggedResult[],
	axis: AxisId
): BrowseFacetOption[] {
	const counts = new Map<AxisLevel, number>();
	for (const { result } of tagged) {
		if (!result.facets) continue;
		const level = result.facets[axis].level;
		counts.set(level, (counts.get(level) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([level, count]) => ({ id: String(level), label: AXIS_LEVEL_LABELS[level], count, level }))
		.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
}

function sortWithinGroup(a: TaggedResult, b: TaggedResult): number {
	return (
		a.result.categoryLabel.localeCompare(b.result.categoryLabel) ||
		a.result.modifier.localeCompare(b.result.modifier) ||
		a.result.caseId.localeCompare(b.result.caseId)
	);
}

/** Group filtered results into compare lanes (skill rows, medium rows, etc.). */
export function groupTaggedResults(
	tagged: readonly TaggedResult[],
	groupBy: BrowseGroupBy
): BrowseGroup[] {
	if (groupBy === 'none') {
		return [
			{
				id: 'all',
				label: 'All matching',
				results: [...tagged].sort(sortWithinGroup).map((entry) => entry.result)
			}
		];
	}

	const isLevelGroup = groupBy.endsWith('-level');
	const axis = (isLevelGroup ? groupBy.replace('-level', '') : groupBy) as AxisId | 'mood';

	const buckets = new Map<string, TaggedResult[]>();
	for (const entry of tagged) {
		if (!entry.result.facets) continue;
		const key: string =
			axis === 'mood'
				? entry.result.facets.mood.key
				: isLevelGroup
					? String(entry.result.facets[axis].level)
					: entry.result.facets[axis].key;
		const list = buckets.get(key);
		if (list) list.push(entry);
		else buckets.set(key, [entry]);
	}

	const keys = [...buckets.keys()];
	if (isLevelGroup) {
		keys.sort((a, b) => Number(a) - Number(b));
	} else {
		keys.sort((a, b) => a.localeCompare(b));
	}

	return keys.map((key) => {
		const entries = (buckets.get(key) ?? []).sort(sortWithinGroup);
		const first = entries[0]?.result.facets;
		const label = isLevelGroup
			? `${AXIS_LEVEL_LABELS[Number(key) as AxisLevel]} (Level ${key})`
			: axis === 'mood'
				? (first?.mood.label ?? key)
				: (first?.[axis as AxisId].label ?? key);
		return {
			id: key,
			label,
			results: entries.map((entry) => entry.result)
		};
	});
}

export function applyBrowsePreset(query: BrowseQuery, preset: BrowsePreset): BrowseQuery {
	return {
		...query,
		text: preset.apply.text ?? '',
		category: preset.apply.category ?? 'all',
		keys: preset.apply.keys ? { ...emptyKeys(), ...preset.apply.keys } : emptyKeys(),
		levels: preset.apply.levels ? { ...emptyLevels(), ...preset.apply.levels } : emptyLevels(),
		moods: preset.apply.moods ? [...preset.apply.moods] : []
	};
}

export { axisLabel };
