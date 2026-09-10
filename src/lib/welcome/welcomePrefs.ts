/** Device flag — not career progress. Switching save slots must not re-show the one-pager. */
export const WELCOME_STORAGE_KEY = 'adt.welcome.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * True only when the stored blob has `dismissed === true`.
 * Missing, malformed, or unavailable storage → false (show the tutorial).
 */
export function loadWelcomeDismissed(): boolean {
	try {
		if (typeof localStorage === 'undefined') return false;
		const raw = localStorage.getItem(WELCOME_STORAGE_KEY);
		if (raw === null) return false;
		const parsed: unknown = JSON.parse(raw);
		return isRecord(parsed) && parsed.dismissed === true;
	} catch {
		return false;
	}
}

/** Writes `{ version: 1, dismissed: true }`. Swallows quota / private-mode errors. */
export function persistWelcomeDismissed(): void {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify({ version: 1, dismissed: true }));
	} catch {
		// Storage full or unavailable — same swallow policy as save.ts.
	}
}
