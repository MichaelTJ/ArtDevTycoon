import type { ExplorerResult } from './types';

export function resultKey(result: Pick<ExplorerResult, 'engineId' | 'caseId'>): string {
	return `${result.engineId}:${result.caseId}`;
}

export function generationTagKey(tag: { kind: string; id: string }): string {
	return `${tag.kind}:${tag.id}`;
}

export function goodTagsOf(result: ExplorerResult): string[] {
	return Array.isArray(result.goodTags) ? result.goodTags : [];
}

export function hasAnyGoodTag(result: ExplorerResult): boolean {
	return goodTagsOf(result).length > 0;
}

export function isPromptTagGood(
	result: ExplorerResult,
	tag: { kind: string; id: string }
): boolean {
	return goodTagsOf(result).includes(generationTagKey(tag));
}

export function toggleGoodTagList(tags: readonly string[], tagKey: string): string[] {
	return tags.includes(tagKey) ? tags.filter((id) => id !== tagKey) : [...tags, tagKey];
}
