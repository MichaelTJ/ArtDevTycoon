import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import type { ExplorerManifest, ExplorerResult, PromptFacets } from './types';

const OUTPUT_DIR = path.resolve('data/modifier-explorer');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

/** Accept `kind:id` keys like `style:crayon` or `mood:serene`. */
function sanitizeGoodTags(tags: unknown): string[] {
	if (!Array.isArray(tags)) return [];
	return [
		...new Set(
			tags.filter(
				(tag): tag is string =>
					typeof tag === 'string' && /^[a-z]+:[a-z0-9_-]+$/i.test(tag) && tag.length <= 80
			)
		)
	];
}

interface SavePayload {
	engineId: 'janus-webgpu' | 'sdturbo-webgpu';
	caseId: string;
	category: string;
	categoryLabel: string;
	modifier: string;
	subject: string;
	prompt: string;
	facets: PromptFacets;
	generationMs: number;
	clientEncodeMs?: number;
	clientTotalMs?: number;
	seed?: number;
	pngBase64: string;
}

async function ensureOutputDir(): Promise<void> {
	await fs.mkdir(OUTPUT_DIR, { recursive: true });
	await fs.mkdir(path.join(OUTPUT_DIR, 'janus-webgpu'), { recursive: true });
	await fs.mkdir(path.join(OUTPUT_DIR, 'sdturbo-webgpu'), { recursive: true });
}

async function readManifest(): Promise<ExplorerManifest> {
	try {
		const raw = await fs.readFile(MANIFEST_PATH, 'utf8');
		return JSON.parse(raw) as ExplorerManifest;
	} catch {
		return { version: 1, results: [] };
	}
}

async function writeManifest(manifest: ExplorerManifest): Promise<void> {
	await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

async function readJsonBody<T>(req: import('node:http').IncomingMessage): Promise<T> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
	}
	return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

async function wipeGalleryFiles(): Promise<void> {
	await ensureOutputDir();
	for (const engine of ['janus-webgpu', 'sdturbo-webgpu'] as const) {
		const dir = path.join(OUTPUT_DIR, engine);
		const entries = await fs.readdir(dir).catch(() => [] as string[]);
		await Promise.all(
			entries.map((name) => fs.unlink(path.join(dir, name)).catch(() => undefined))
		);
	}
}

function registerRoutes(server: ViteDevServer): void {
	server.middlewares.use(async (req, res, next) => {
		const url = req.url ?? '';

		if (url.startsWith('/modifier-explorer-output/')) {
			const relative = decodeURIComponent(url.slice('/modifier-explorer-output/'.length));
			const filePath = path.join(OUTPUT_DIR, relative);
			if (!filePath.startsWith(OUTPUT_DIR)) {
				res.statusCode = 403;
				res.end('Forbidden');
				return;
			}

			try {
				const data = await fs.readFile(filePath);
				res.setHeader('Content-Type', 'image/png');
				res.setHeader('Cache-Control', 'no-cache');
				res.end(data);
			} catch {
				res.statusCode = 404;
				res.end('Not found');
			}
			return;
		}

		if (url === '/api/modifier-explorer/manifest' && req.method === 'GET') {
			try {
				await ensureOutputDir();
				const manifest = await readManifest();
				manifest.results = manifest.results.map((entry) => {
					const legacy = entry as ExplorerResult & {
						tags?: unknown;
						picked?: unknown;
						pickedAt?: unknown;
					};
					const rest = { ...legacy };
					delete rest.tags;
					delete rest.picked;
					delete rest.pickedAt;
					return {
						...rest,
						goodTags: Array.isArray(entry.goodTags) ? entry.goodTags : []
					};
				});
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(manifest));
			} catch (error) {
				res.statusCode = 500;
				res.end(error instanceof Error ? error.message : 'Manifest read failed');
			}
			return;
		}

		if (url === '/api/modifier-explorer/save' && req.method === 'POST') {
			try {
				await ensureOutputDir();
				const persistStartedAt = Date.now();
				const payload = await readJsonBody<SavePayload>(req);
				const imagePath = `${payload.engineId}/${payload.caseId}.png`;
				const filePath = path.join(OUTPUT_DIR, imagePath);
				const pngBuffer = Buffer.from(payload.pngBase64, 'base64');
				await fs.writeFile(filePath, pngBuffer);

				const persistMs = Date.now() - persistStartedAt;
				const encodeMs = payload.clientEncodeMs ?? 0;
				const saveMs = encodeMs + persistMs;
				const totalMs = (payload.clientTotalMs ?? payload.generationMs + encodeMs) + persistMs;

				const result: ExplorerResult = {
					caseId: payload.caseId,
					engineId: payload.engineId,
					category: payload.category as ExplorerResult['category'],
					categoryLabel: payload.categoryLabel,
					modifier: payload.modifier,
					subject: payload.subject,
					prompt: payload.prompt,
					facets: payload.facets,
					imagePath,
					generationMs: payload.generationMs,
					saveMs,
					totalMs,
					generatedAt: new Date().toISOString(),
					seed: payload.seed,
					goodTags: []
				};

				const manifest = await readManifest();
				const existingIndex = manifest.results.findIndex(
					(entry) => entry.engineId === result.engineId && entry.caseId === result.caseId
				);
				if (existingIndex >= 0) {
					const existing = manifest.results[existingIndex];
					manifest.results[existingIndex] = {
						...result,
						goodTags: existing?.goodTags ?? []
					};
				} else {
					manifest.results.push(result);
				}
				await writeManifest(manifest);

				const saved =
					manifest.results[existingIndex >= 0 ? existingIndex : manifest.results.length - 1];
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(saved));
			} catch (error) {
				res.statusCode = 500;
				res.end(error instanceof Error ? error.message : 'Save failed');
			}
			return;
		}

		if (url === '/api/modifier-explorer/good-tags' && req.method === 'POST') {
			try {
				const payload = await readJsonBody<{
					engineId: ExplorerResult['engineId'];
					caseId: string;
					goodTags: string[];
				}>(req);

				const manifest = await readManifest();
				const index = manifest.results.findIndex(
					(entry) => entry.engineId === payload.engineId && entry.caseId === payload.caseId
				);
				if (index < 0) {
					res.statusCode = 404;
					res.end('Result not found');
					return;
				}

				const entry = { ...manifest.results[index], goodTags: sanitizeGoodTags(payload.goodTags) };
				manifest.results[index] = entry;
				await writeManifest(manifest);

				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(entry));
			} catch (error) {
				res.statusCode = 500;
				res.end(error instanceof Error ? error.message : 'Good-tag update failed');
			}
			return;
		}

		if (url === '/api/modifier-explorer/wipe' && req.method === 'POST') {
			try {
				await wipeGalleryFiles();
				const manifest: ExplorerManifest = { version: 1, results: [] };
				await writeManifest(manifest);
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(manifest));
			} catch (error) {
				res.statusCode = 500;
				res.end(error instanceof Error ? error.message : 'Wipe failed');
			}
			return;
		}

		next();
	});
}

/** Dev-only disk persistence for the modifier explorer gallery. */
export function modifierExplorerPlugin(): Plugin {
	return {
		name: 'modifier-explorer',
		configureServer(server) {
			registerRoutes(server);
		}
	};
}
