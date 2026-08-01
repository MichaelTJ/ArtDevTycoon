import { DEFAULT_MEDIUM_TIER_ID, getMediumTier } from '$lib/data/mediumTiers';

/**
 * Narrow mutator surface for Dev cheats. Implemented by GameStore `dev*` methods;
 * kept DOM-free so unit tests can drive it with a fake.
 */
export interface DevCheatPort {
	getCash(): number;
	setCash(n: number): void;
	getReputation(): number;
	setReputation(n: number): void;
	setLifetimeCommissions(n: number): void;
	unlockAllMediums(): void;
	unlockAllVenues(): void;
	unlockAllClientTiers(): void;
	hireAllStaff(): void;
	/** Abort commission → idle. */
	forceIdle(): void;
	/** Export active SaveData JSON string (pretty). */
	exportSaveJson(): string;
	/** Replace active save from JSON; return ok / error message. */
	importSaveJson(raw: string): { ok: true } | { ok: false; error: string };
}

const MAX_CHEAT_CASH = 1_000_000_000;
const MAX_CHEAT_REP = 1_000_000;

/** Integer cash clamp for Dev economy inputs. */
export function clampCheatCash(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.min(MAX_CHEAT_CASH, Math.max(0, Math.trunc(n)));
}

/** Integer reputation clamp for Dev economy inputs. */
export function clampCheatRep(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.min(MAX_CHEAT_REP, Math.max(0, Math.trunc(n)));
}

/**
 * Returns the hidden Level 1 (crayon) modifier suffix for DevPanel display ONLY.
 * Same source `buildLevel1Prompt` uses — never duplicate the string.
 */
export function peekLevel1ModifierSuffix(): string {
	return getMediumTier(DEFAULT_MEDIUM_TIER_ID).promptModifierSuffix;
}
