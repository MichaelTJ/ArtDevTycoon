import { describe, expect, it } from 'vitest';
import {
	MODEL_LOADING_FOOTNOTE,
	busyChannelForVenue,
	npcBusyLine,
	type NpcBusyChannel
} from './npcBusyDialogue';

const CHANNELS: readonly NpcBusyChannel[] = [
	'mum',
	'letterbox',
	'computer',
	'receptionist',
	'visitor'
];

describe('busyChannelForVenue', () => {
	it('maps venues to idle busy channels', () => {
		expect(busyChannelForVenue('fridge')).toBe('mum');
		expect(busyChannelForVenue('garage')).toBe('letterbox');
		expect(busyChannelForVenue('storefront')).toBe('computer');
		expect(busyChannelForVenue('gallery-hall')).toBe('receptionist');
		expect(busyChannelForVenue('mega-museum')).toBe('receptionist');
		expect(busyChannelForVenue('nope')).toBe('visitor');
	});
});

describe('npcBusyLine', () => {
	it('returns the model-loading table with the loading footnote', () => {
		expect(npcBusyLine({ reason: 'model-loading', channel: 'mum' })).toEqual({
			speaker: 'Mum',
			text: "Sorry hun, I'm just busy for a second. Maybe you want to practice for a bit.",
			footnote: MODEL_LOADING_FOOTNOTE
		});
		expect(npcBusyLine({ reason: 'model-loading', channel: 'letterbox' })).toEqual({
			speaker: 'Letterbox',
			text: "Hold on — the post's still warming up.",
			footnote: MODEL_LOADING_FOOTNOTE
		});
		expect(npcBusyLine({ reason: 'model-loading', channel: 'computer' })).toEqual({
			speaker: 'Inbox',
			text: 'Inbox is still connecting. Give it a second.',
			footnote: MODEL_LOADING_FOOTNOTE
		});
		expect(npcBusyLine({ reason: 'model-loading', channel: 'receptionist' })).toEqual({
			speaker: 'Receptionist',
			text: "I'm on a call with the next client — one moment.",
			footnote: MODEL_LOADING_FOOTNOTE
		});
		expect(npcBusyLine({ reason: 'model-loading', channel: 'visitor' })).toEqual({
			speaker: 'Client',
			text: "Give me one second — I'm not ready yet.",
			footnote: MODEL_LOADING_FOOTNOTE
		});
	});

	it('rotates Mum critiquing lines and uses the visitor pool for other channels', () => {
		expect(npcBusyLine({ reason: 'critiquing', channel: 'mum', talkIndex: 0 })).toEqual({
			speaker: 'Mum',
			text: 'Wow! Let me make sure I see all your beautiful work!',
			footnote: null
		});
		expect(npcBusyLine({ reason: 'critiquing', channel: 'mum', talkIndex: 1 })).toEqual({
			speaker: 'Mum',
			text: "I'm just taking it all in, I'll let you know when I'm done",
			footnote: null
		});
		expect(npcBusyLine({ reason: 'critiquing', channel: 'visitor', talkIndex: 0 })).toEqual({
			speaker: 'Client',
			text: 'Give me a minute — I want to really look at this.',
			footnote: null
		});
		expect(npcBusyLine({ reason: 'critiquing', channel: 'visitor', talkIndex: 1 })).toEqual({
			speaker: 'Client',
			text: "Don't hover. I'll tell you when I've decided.",
			footnote: null
		});
		expect(npcBusyLine({ reason: 'critiquing', channel: 'letterbox', talkIndex: 0 })).toEqual({
			speaker: 'Client',
			text: 'Give me a minute — I want to really look at this.',
			footnote: null
		});
		expect(npcBusyLine({ reason: 'critiquing', channel: 'computer', talkIndex: 1 })).toEqual({
			speaker: 'Client',
			text: "Don't hover. I'll tell you when I've decided.",
			footnote: null
		});
		expect(npcBusyLine({ reason: 'critiquing', channel: 'receptionist', talkIndex: 0 })).toEqual({
			speaker: 'Client',
			text: 'Give me a minute — I want to really look at this.',
			footnote: null
		});
	});

	it('treats a missing talkIndex as 0 and wraps with abs modulo', () => {
		const base = npcBusyLine({ reason: 'critiquing', channel: 'mum' });
		expect(npcBusyLine({ reason: 'critiquing', channel: 'mum', talkIndex: 0 })).toEqual(base);
		expect(npcBusyLine({ reason: 'critiquing', channel: 'mum', talkIndex: 2 })).toEqual(base);
		expect(npcBusyLine({ reason: 'critiquing', channel: 'mum', talkIndex: -1 })).toEqual(
			npcBusyLine({ reason: 'critiquing', channel: 'mum', talkIndex: 1 })
		);
	});

	it('keeps authoring invariants for every channel', () => {
		const banned = /janus|webgpu|sdturbo|api key|modifier/i;
		for (const channel of CHANNELS) {
			const loading = npcBusyLine({ reason: 'model-loading', channel });
			expect(loading.text.length).toBeLessThanOrEqual(90);
			expect(loading.footnote).toBe('(model loading)');
			expect(banned.test(loading.text)).toBe(false);
			expect(banned.test(loading.speaker)).toBe(false);

			for (const talkIndex of [0, 1]) {
				const line = npcBusyLine({ reason: 'critiquing', channel, talkIndex });
				expect(line.text.length).toBeLessThanOrEqual(90);
				expect(line.footnote).toBeNull();
				expect(banned.test(line.text)).toBe(false);
				expect(banned.test(line.speaker)).toBe(false);
			}
		}
	});
});
