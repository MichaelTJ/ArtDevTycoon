import type { ExplorerEngineId, ExplorerManifest, ExplorerResult, PromptFacets } from './types';

const API_BASE = '/api/modifier-explorer2';
export const OUTPUT_BASE = '/modifier-explorer2-output';

export function imageUrlForResult(result: ExplorerResult): string {
	return `${OUTPUT_BASE}/${result.imagePath}`;
}

export async function fetchManifest(): Promise<ExplorerManifest> {
	const response = await fetch(`${API_BASE}/manifest`);
	if (!response.ok) {
		throw new Error(`Failed to load manifest (${response.status})`);
	}
	return (await response.json()) as ExplorerManifest;
}

export async function saveResult(input: {
	engineId: ExplorerEngineId;
	caseId: string;
	category: ExplorerResult['category'];
	categoryLabel: string;
	modifier: string;
	subject: string;
	prompt: string;
	facets: PromptFacets;
	generationMs: number;
	clientEncodeMs?: number;
	clientTotalMs?: number;
	seed?: number;
	pngBytes: Uint8Array;
}): Promise<ExplorerResult> {
	const response = await fetch(`${API_BASE}/save`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			engineId: input.engineId,
			caseId: input.caseId,
			category: input.category,
			categoryLabel: input.categoryLabel,
			modifier: input.modifier,
			subject: input.subject,
			prompt: input.prompt,
			facets: input.facets,
			generationMs: input.generationMs,
			clientEncodeMs: input.clientEncodeMs,
			clientTotalMs: input.clientTotalMs,
			seed: input.seed,
			pngBase64: bytesToBase64(input.pngBytes)
		})
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to save result (${response.status}): ${text}`);
	}

	return (await response.json()) as ExplorerResult;
}

export function existingCaseIds(
	manifest: ExplorerManifest,
	engineId: ExplorerEngineId
): Set<string> {
	return new Set(
		manifest.results.filter((result) => result.engineId === engineId).map((result) => result.caseId)
	);
}

export async function setResultGoodTags(input: {
	engineId: ExplorerEngineId;
	caseId: string;
	goodTags: string[];
}): Promise<ExplorerResult> {
	const response = await fetch(`${API_BASE}/good-tags`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input)
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to update good tags (${response.status}): ${text}`);
	}

	return (await response.json()) as ExplorerResult;
}

export async function wipeExplorerGallery(): Promise<ExplorerManifest> {
	const response = await fetch(`${API_BASE}/wipe`, { method: 'POST' });
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to wipe gallery (${response.status}): ${text}`);
	}
	return (await response.json()) as ExplorerManifest;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i] ?? 0);
	}
	return btoa(binary);
}

export async function objectUrlToPngBytes(url: string): Promise<Uint8Array> {
	const response = await fetch(url);
	const blob = await response.blob();
	const buffer = await blob.arrayBuffer();
	return new Uint8Array(buffer);
}

export function isExplorerStorageAvailable(): boolean {
	return import.meta.env.DEV;
}
