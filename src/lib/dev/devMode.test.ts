import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	DEV_LATCH_KEY,
	clearDevLatch,
	loadDevLatch,
	persistDevLatch,
	resolveDevMode,
	type DevLatch
} from './devMode';

function params(query: string): URLSearchParams {
	return new URLSearchParams(query);
}

describe('resolveDevMode', () => {
	it.each([
		{
			name: 'production default off',
			viteDev: false,
			query: '',
			latch: null as DevLatch | null,
			enabled: false,
			reason: 'off' as const
		},
		{
			name: 'dev=1 enables via query',
			viteDev: false,
			query: 'dev=1',
			latch: null,
			enabled: true,
			reason: 'query' as const
		},
		{
			name: 'dev=0 overrides latch',
			viteDev: false,
			query: 'dev=0',
			latch: { version: 1 as const, latched: true },
			enabled: false,
			reason: 'off' as const
		},
		{
			name: 'latch enables without query',
			viteDev: false,
			query: '',
			latch: { version: 1 as const, latched: true },
			enabled: true,
			reason: 'latch' as const
		},
		{
			name: 'viteDev enables without query',
			viteDev: true,
			query: '',
			latch: null,
			enabled: true,
			reason: 'vite' as const
		},
		{
			name: 'studioDebug=1 aliases query',
			viteDev: false,
			query: 'studioDebug=1',
			latch: null,
			enabled: true,
			reason: 'query' as const
		}
	])('$name', ({ viteDev, query, latch, enabled, reason }) => {
		expect(
			resolveDevMode({
				searchParams: params(query),
				viteDev,
				latch
			})
		).toEqual({ enabled, reason });
	});

	it('dev=0 overrides viteDev', () => {
		expect(
			resolveDevMode({
				searchParams: params('dev=0'),
				viteDev: true,
				latch: null
			})
		).toEqual({ enabled: false, reason: 'off' });
	});

	it('dev=true is accepted like dev=1', () => {
		expect(
			resolveDevMode({
				searchParams: params('dev=true'),
				viteDev: false,
				latch: null
			})
		).toEqual({ enabled: true, reason: 'query' });
	});

	it('query wins over latch', () => {
		expect(
			resolveDevMode({
				searchParams: params('dev=1'),
				viteDev: false,
				latch: { version: 1, latched: true }
			})
		).toEqual({ enabled: true, reason: 'query' });
	});
});

describe('dev latch storage', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('persist + load round-trip', () => {
		const map = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => map.get(k) ?? null,
			setItem: (k: string, v: string) => {
				map.set(k, v);
			},
			removeItem: (k: string) => {
				map.delete(k);
			}
		});
		persistDevLatch({ version: 1, latched: true });
		expect(loadDevLatch()).toEqual({ version: 1, latched: true });
		expect(map.get(DEV_LATCH_KEY)).toBeTruthy();
		clearDevLatch();
		expect(loadDevLatch()).toBeNull();
	});

	it('load returns null for malformed latch', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => '{bad',
			setItem: () => {},
			removeItem: () => {}
		});
		expect(loadDevLatch()).toBeNull();
	});

	it('persist/clear never throw when storage throws', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			},
			removeItem: () => {
				throw new Error('blocked');
			}
		});
		expect(() => loadDevLatch()).not.toThrow();
		expect(() => persistDevLatch({ version: 1, latched: true })).not.toThrow();
		expect(() => clearDevLatch()).not.toThrow();
		expect(loadDevLatch()).toBeNull();
	});
});
