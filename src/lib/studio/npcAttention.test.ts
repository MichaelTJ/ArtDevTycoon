import { describe, expect, it } from 'vitest';
import { npcAttention, playerDeskLocked, showAttentionMark } from './npcAttention';

describe('playerDeskLocked', () => {
	it('locks the player only while generating', () => {
		expect(playerDeskLocked('generating')).toBe(true);
		expect(playerDeskLocked('critiquing')).toBe(false);
		expect(playerDeskLocked('idle')).toBe(false);
		expect(playerDeskLocked('briefing')).toBe(false);
		expect(playerDeskLocked('results')).toBe(false);
	});
});

describe('npcAttention', () => {
	it('follows the ready-commission and critique-ready table', () => {
		expect(npcAttention({ phase: 'idle', modelLoading: true, readyForCommission: true })).toBe(
			'none'
		);
		expect(npcAttention({ phase: 'idle', modelLoading: false, readyForCommission: true })).toBe(
			'ready-commission'
		);
		expect(npcAttention({ phase: 'idle', modelLoading: false, readyForCommission: false })).toBe(
			'none'
		);
		expect(
			npcAttention({ phase: 'critiquing', modelLoading: false, readyForCommission: false })
		).toBe('none');
		expect(npcAttention({ phase: 'results', modelLoading: false, readyForCommission: false })).toBe(
			'critique-ready'
		);
		expect(npcAttention({ phase: 'results', modelLoading: true, readyForCommission: false })).toBe(
			'critique-ready'
		);
	});
});

describe('showAttentionMark', () => {
	it('hides the bang when the E prompt is on that NPC', () => {
		expect(showAttentionMark('ready-commission', false)).toBe(true);
		expect(showAttentionMark('ready-commission', true)).toBe(false);
		expect(showAttentionMark('none', false)).toBe(false);
	});
});
