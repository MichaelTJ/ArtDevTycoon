import type { GamePhase } from '$lib/types/contracts';

export type NpcAttention = 'none' | 'ready-commission' | 'critique-ready';

/**
 * Desk-lock: player snapped to desk, walk/interact disabled.
 * ONLY `generating` — not `critiquing`.
 */
export function playerDeskLocked(phase: GamePhase | string): boolean {
	return phase === 'generating';
}

/**
 * `!` over the commission NPC / channel sprite.
 * - results → critique-ready (always, even if modelLoading — load cannot start mid-critique
 *   because the engine menu is locked; still pin the results row with modelLoading true)
 * - idle + readyForCommission + !modelLoading → ready-commission
 * - else none
 */
export function npcAttention(input: {
	phase: GamePhase | string;
	modelLoading: boolean;
	readyForCommission: boolean;
}): NpcAttention {
	if (input.phase === 'results') return 'critique-ready';
	if (input.phase === 'idle' && input.readyForCommission && !input.modelLoading) {
		return 'ready-commission';
	}
	return 'none';
}

/**
 * Hide the `!` while the E verb is showing on that same NPC so they do not stack.
 */
export function showAttentionMark(attention: NpcAttention, promptOnNpc: boolean): boolean {
	if (attention === 'none') return false;
	return !promptOnNpc;
}
