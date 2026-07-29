import { LEVEL_1 } from '$lib/types/contracts';

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Both conditions must hold: five commissions AND $500 banked. */
export function isLevelComplete(state: { cash: number; commissionsCompleted: number }): boolean {
	return (
		state.commissionsCompleted >= LEVEL_1.targetCommissions && state.cash >= LEVEL_1.targetCash
	);
}

/** Fractions in the range 0-1, for the HUD progress bars. */
export function levelProgress(state: { cash: number; commissionsCompleted: number }): {
	commissions: number;
	cash: number;
	/** The lower of the two, i.e. how close the player is to the actual win. */
	overall: number;
} {
	const commissions = clamp(state.commissionsCompleted / LEVEL_1.targetCommissions, 0, 1);
	const cash = clamp(state.cash / LEVEL_1.targetCash, 0, 1);
	return { commissions, cash, overall: Math.min(commissions, cash) };
}
