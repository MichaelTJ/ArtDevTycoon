import { z } from 'zod';

export const DEV_QUERY_PARAM = 'dev';
/** Persists “keep dev tools on” across reloads in this browser. */
export const DEV_LATCH_KEY = 'adt.dev.v1';

export const devLatchSchema = z.object({
	version: z.literal(1),
	/** When true, Dev mode stays on even without ?dev=1 until cleared. */
	latched: z.boolean()
});

export type DevLatch = z.infer<typeof devLatchSchema>;

export type DevModeReason = 'query' | 'vite' | 'latch' | 'off';

/**
 * Pure gate for Dev tools. Production static host + no query + no latch → off.
 * `?studioDebug=1` is a one-release alias of `?dev=1` (unless `dev=0`).
 */
export function resolveDevMode(input: {
	searchParams: URLSearchParams | { get(name: string): string | null };
	viteDev: boolean;
	latch: DevLatch | null;
}): { enabled: boolean; reason: DevModeReason } {
	const dev = input.searchParams.get(DEV_QUERY_PARAM);
	if (dev === '0') {
		return { enabled: false, reason: 'off' };
	}
	if (dev === '1' || dev === 'true') {
		return { enabled: true, reason: 'query' };
	}
	if (input.searchParams.get('studioDebug') === '1') {
		return { enabled: true, reason: 'query' };
	}
	if (input.latch?.latched === true) {
		return { enabled: true, reason: 'latch' };
	}
	if (input.viteDev) {
		return { enabled: true, reason: 'vite' };
	}
	return { enabled: false, reason: 'off' };
}

/** Reads `adt.dev.v1`. Returns null on missing/invalid storage. Never throws. */
export function loadDevLatch(): DevLatch | null {
	try {
		const raw = localStorage.getItem(DEV_LATCH_KEY);
		if (raw === null) return null;
		const parsed: unknown = JSON.parse(raw);
		const result = devLatchSchema.safeParse(parsed);
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

/** Writes the latch blob. Never throws. */
export function persistDevLatch(latch: DevLatch): void {
	try {
		localStorage.setItem(DEV_LATCH_KEY, JSON.stringify(latch));
	} catch {
		// Storage full or unavailable — same swallow policy as save.ts.
	}
}

/** Removes the latch key. Never throws. */
export function clearDevLatch(): void {
	try {
		localStorage.removeItem(DEV_LATCH_KEY);
	} catch {
		// ignore
	}
}
