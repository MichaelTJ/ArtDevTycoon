import { describe, expect, test, vi } from 'vitest';
import { SFX } from './catalog';
import { MuteSafePlayer, type AudioElementLike } from './player';

function stubAudio(overrides: Partial<AudioElementLike> = {}) {
	const el: AudioElementLike = {
		src: '',
		loop: false,
		volume: 1,
		paused: true,
		currentTime: 0,
		play: vi.fn(async () => {
			el.paused = false;
		}),
		pause: vi.fn(() => {
			el.paused = true;
		}),
		load: vi.fn(),
		...overrides
	};
	const Ctor = vi.fn(function AudioStub(this: AudioElementLike, src?: string) {
		el.src = src ?? '';
		return el;
	}) as unknown as new (src?: string) => AudioElementLike;
	return { el, Ctor };
}

describe('MuteSafePlayer', () => {
	test('play sets volume and calls play', async () => {
		const { el, Ctor } = stubAudio();
		const player = new MuteSafePlayer({ AudioCtor: Ctor });
		player.play(SFX['work-pencil'], 0.5);
		expect(Ctor).toHaveBeenCalledWith('/studio/audio/sfx/work-pencil.wav');
		expect(el.volume).toBe(0.5);
		expect(el.play).toHaveBeenCalled();
	});

	test('gain 0 pauses without calling play', () => {
		const { el, Ctor } = stubAudio({ paused: false });
		const player = new MuteSafePlayer({ AudioCtor: Ctor });
		player.play(SFX['work-pencil'], 0);
		expect(el.pause).toHaveBeenCalled();
		expect(el.play).not.toHaveBeenCalled();
	});

	test('rejecting play never throws', () => {
		const { el, Ctor } = stubAudio({
			play: vi.fn(async () => {
				throw new Error('NotAllowedError');
			})
		});
		const player = new MuteSafePlayer({ AudioCtor: Ctor });
		expect(() => player.play(SFX['stinger-cash'], 1)).not.toThrow();
		expect(el.play).toHaveBeenCalled();
	});

	test('playOneShot resets currentTime', () => {
		const { el, Ctor } = stubAudio({ currentTime: 1.2 });
		const player = new MuteSafePlayer({ AudioCtor: Ctor });
		player.playOneShot(SFX['stinger-cash'], 0.8);
		expect(el.currentTime).toBe(0);
		expect(el.play).toHaveBeenCalled();
	});

	test('missing Audio constructor is a silent no-op', () => {
		const player = new MuteSafePlayer({
			AudioCtor: undefined
		});
		// Force null path by passing a ctor that throws
		const Throwing = function () {
			throw new Error('no audio');
		} as unknown as new (src?: string) => AudioElementLike;
		const p2 = new MuteSafePlayer({ AudioCtor: Throwing });
		expect(() => p2.play(SFX['work-pencil'], 1)).not.toThrow();
		expect(() => player.dispose()).not.toThrow();
	});
});
