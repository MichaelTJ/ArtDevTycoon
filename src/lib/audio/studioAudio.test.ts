import { describe, expect, test, vi } from 'vitest';
import { createStudioAudio } from './controller.svelte';
import { createDefaultAudioPrefs } from './schema';
import type { AudioElementLike } from './player';

function makeAudioHarness() {
	const elements: AudioElementLike[] = [];
	const Ctor = vi.fn(function AudioStub(this: AudioElementLike, src?: string) {
		const el: AudioElementLike = {
			src: src ?? '',
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
			load: vi.fn()
		};
		elements.push(el);
		return el;
	}) as unknown as new (src?: string) => AudioElementLike;
	return { Ctor, elements };
}

describe('createStudioAudio', () => {
	test('no audio until unlock; music stays silent at default musicVolume 0', () => {
		const { Ctor, elements } = makeAudioHarness();
		const audio = createStudioAudio({
			AudioCtor: Ctor,
			initialPrefs: createDefaultAudioPrefs(),
			persist: false
		});

		audio.syncMusicForVenue('fridge');
		audio.onPhase('generating');
		expect(
			elements.every((el) => (el.play as ReturnType<typeof vi.fn>).mock.calls.length === 0)
		).toBe(true);

		audio.unlock();
		// Default musicVolume 0 → music bed must not play
		const musicPlays = elements.filter((el) => el.src.includes('kitchen-hum'));
		for (const el of musicPlays) {
			expect(el.play).not.toHaveBeenCalled();
		}
		// SFX work loop may play (sfxVolume 0.65)
		expect(elements.some((el) => (el.play as ReturnType<typeof vi.fn>).mock.calls.length > 0)).toBe(
			true
		);
		audio.dispose();
	});

	test('generating / critiquing start the correct work loop; idle stops', () => {
		const { Ctor, elements } = makeAudioHarness();
		const audio = createStudioAudio({
			AudioCtor: Ctor,
			initialPrefs: { ...createDefaultAudioPrefs(), sfxVolume: 1 },
			persist: false
		});
		audio.unlock();

		audio.onPhase('generating');
		const pencil = elements.find((el) => el.src.includes('work-pencil'));
		expect(pencil?.play).toHaveBeenCalled();

		audio.onPhase('critiquing');
		expect(pencil?.pause).toHaveBeenCalled();
		const critique = elements.find((el) => el.src.includes('work-critique'));
		expect(critique?.play).toHaveBeenCalled();

		audio.onPhase('idle');
		expect(critique?.pause).toHaveBeenCalled();
		audio.dispose();
	});

	test('cash and level-up stingers call play after unlock', () => {
		const { Ctor, elements } = makeAudioHarness();
		const audio = createStudioAudio({
			AudioCtor: Ctor,
			initialPrefs: { ...createDefaultAudioPrefs(), sfxVolume: 1 },
			persist: false
		});
		audio.playCashStinger();
		expect(elements).toHaveLength(0);

		audio.unlock();
		audio.playCashStinger();
		audio.playLevelUpStinger();
		expect(elements.some((el) => el.src.includes('stinger-cash'))).toBe(true);
		expect(elements.some((el) => el.src.includes('stinger-levelup'))).toBe(true);
		audio.dispose();
	});

	test('rejecting play never throws into commission flow', () => {
		const Ctor = vi.fn(function AudioStub(this: AudioElementLike, src?: string) {
			const el: AudioElementLike = {
				src: src ?? '',
				loop: false,
				volume: 1,
				paused: true,
				currentTime: 0,
				play: vi.fn(async () => {
					throw new Error('decode failed');
				}),
				pause: vi.fn(),
				load: vi.fn()
			};
			return el;
		}) as unknown as new (src?: string) => AudioElementLike;

		const audio = createStudioAudio({
			AudioCtor: Ctor,
			initialPrefs: { ...createDefaultAudioPrefs(), musicVolume: 1, sfxVolume: 1 },
			persist: false
		});
		expect(() => {
			audio.unlock();
			audio.syncMusicForVenue('garage');
			audio.onPhase('generating');
			audio.playCashStinger();
		}).not.toThrow();
		audio.dispose();
	});

	test('setPrefs unlocks music when volume raised after gesture', () => {
		const { Ctor, elements } = makeAudioHarness();
		const audio = createStudioAudio({
			AudioCtor: Ctor,
			initialPrefs: createDefaultAudioPrefs(),
			persist: false
		});
		audio.unlock();
		audio.syncMusicForVenue('fridge');
		audio.setPrefs({ musicVolume: 0.5 });
		const bed = elements.find((el) => el.src.includes('kitchen-hum'));
		expect(bed?.play).toHaveBeenCalled();
		audio.dispose();
	});
});
