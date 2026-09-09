import { commissionChannelForVenue, type CommissionChannel } from '$lib/game/commissionChannel';

export type NpcBusyReason = 'model-loading' | 'critiquing';

/** Who is speaking / which idle channel the player poked. */
export type NpcBusyChannel = 'mum' | 'letterbox' | 'computer' | 'receptionist' | 'visitor';

export interface NpcBusyLine {
	/** Visible speaker, e.g. 'Mum'. */
	speaker: string;
	/** Main sentence. */
	text: string;
	/** Second line under the text; null when unused. */
	footnote: string | null;
}

export const MODEL_LOADING_FOOTNOTE = '(model loading)' as const;

const MODEL_LOADING_LINES: Record<NpcBusyChannel, Omit<NpcBusyLine, 'footnote'>> = {
	mum: {
		speaker: 'Mum',
		text: "Sorry hun, I'm just busy for a second. Maybe you want to practice for a bit."
	},
	letterbox: {
		speaker: 'Letterbox',
		text: "Hold on — the post's still warming up."
	},
	computer: {
		speaker: 'Inbox',
		text: 'Inbox is still connecting. Give it a second.'
	},
	receptionist: {
		speaker: 'Receptionist',
		text: "I'm on a call with the next client — one moment."
	},
	visitor: {
		speaker: 'Client',
		text: "Give me one second — I'm not ready yet."
	}
};

const CRITIQUING_MUM: readonly Omit<NpcBusyLine, 'footnote'>[] = [
	{
		speaker: 'Mum',
		text: 'Wow! Let me make sure I see all your beautiful work!'
	},
	{
		speaker: 'Mum',
		text: "I'm just taking it all in, I'll let you know when I'm done"
	}
];

/** Door client looking at the art — also used for letterbox/computer/receptionist critique talk. */
const CRITIQUING_VISITOR: readonly Omit<NpcBusyLine, 'footnote'>[] = [
	{
		speaker: 'Client',
		text: 'Give me a minute — I want to really look at this.'
	},
	{
		speaker: 'Client',
		text: "Don't hover. I'll tell you when I've decided."
	}
];

function channelFromCommission(channel: CommissionChannel): NpcBusyChannel {
	switch (channel) {
		case 'letterbox':
			return 'letterbox';
		case 'computer':
			return 'computer';
		case 'receptionist':
			return 'receptionist';
		default:
			return 'visitor';
	}
}

/**
 * Map venue → idle busy channel.
 * Kitchen (`fridge`) is always Mum. Higher venues use P27 channels.
 * Unknown venue ids → 'visitor'.
 */
export function busyChannelForVenue(venueId: string): NpcBusyChannel {
	if (venueId === 'fridge') return 'mum';
	return channelFromCommission(commissionChannelForVenue(venueId));
}

function pickFromPool(
	pool: readonly Omit<NpcBusyLine, 'footnote'>[],
	talkIndex: number
): Omit<NpcBusyLine, 'footnote'> {
	const i = Math.abs(talkIndex) % pool.length;
	return pool[i]!;
}

/**
 * Line for HUD + (optional) Phaser bark.
 * `talkIndex` rotates critiquing pools (and is ignored when the pool has one line).
 * Default talkIndex = 0.
 */
export function npcBusyLine(input: {
	reason: NpcBusyReason;
	channel: NpcBusyChannel;
	talkIndex?: number;
}): NpcBusyLine {
	const talkIndex = input.talkIndex ?? 0;
	if (input.reason === 'model-loading') {
		const line = MODEL_LOADING_LINES[input.channel];
		return { ...line, footnote: MODEL_LOADING_FOOTNOTE };
	}
	const pool = input.channel === 'mum' ? CRITIQUING_MUM : CRITIQUING_VISITOR;
	const line = pickFromPool(pool, talkIndex);
	return { ...line, footnote: null };
}
