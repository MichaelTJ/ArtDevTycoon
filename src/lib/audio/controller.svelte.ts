import type { GamePhase } from '$lib/types/contracts';
import { MUSIC_BEDS, SFX, musicBedForVenue, type MusicBedId, type SfxId } from './catalog';
import { effectiveMusicGain, effectiveSfxGain } from './levels';
import {
	createDefaultAudioPrefs,
	loadAudioPrefs,
	persistAudioPrefs,
	type AudioPrefs
} from './schema';
import { MuteSafePlayer, type AudioConstructor } from './player';

export interface StudioAudioController {
	readonly prefs: AudioPrefs;
	readonly unlocked: boolean;

	unlock(): void;
	setPrefs(patch: Partial<Omit<AudioPrefs, 'version'>>): void;
	setMuted(muted: boolean): void;

	/** Swap / start looping bed for venue. No-op if locked or gain 0. */
	syncMusicForVenue(venueId: string): void;
	stopMusic(): void;

	/** Start/stop phase loops. */
	onPhase(phase: GamePhase): void;

	/** One-shots. */
	playCashStinger(): void;
	playLevelUpStinger(): void;

	/** Stable seam for follow-up catalog SFX (C5–C7). */
	playSfx(id: SfxId): void;

	dispose(): void;
}

export interface CreateStudioAudioOptions {
	AudioCtor?: AudioConstructor;
	/** Inject prefs for tests (skips localStorage load). */
	initialPrefs?: AudioPrefs;
	/** Skip persist in tests. */
	persist?: boolean;
}

class StudioAudioImpl implements StudioAudioController {
	prefs = $state<AudioPrefs>(createDefaultAudioPrefs());
	unlocked = $state(false);

	#player: MuteSafePlayer;
	#AudioCtor: AudioConstructor | undefined;
	#persist: boolean;
	#currentBed: MusicBedId | null = null;
	#venueId = 'fridge';
	#phase: GamePhase = 'idle';
	#workLoop: 'work-pencil' | 'work-critique' | null = null;

	constructor(options: CreateStudioAudioOptions = {}) {
		this.#AudioCtor = options.AudioCtor;
		this.#player = new MuteSafePlayer({ AudioCtor: options.AudioCtor });
		this.#persist = options.persist !== false;
		this.prefs = options.initialPrefs ?? loadAudioPrefs();
	}

	unlock(): void {
		if (this.unlocked) return;
		this.unlocked = true;
		this.syncMusicForVenue(this.#venueId);
		this.onPhase(this.#phase);
	}

	setPrefs(patch: Partial<Omit<AudioPrefs, 'version'>>): void {
		this.prefs = {
			...this.prefs,
			...patch,
			version: 1
		};
		if (this.#persist) persistAudioPrefs(this.prefs);
		this.#applyGains();
		if (this.unlocked) {
			this.syncMusicForVenue(this.#venueId);
			this.onPhase(this.#phase);
		}
	}

	setMuted(muted: boolean): void {
		this.setPrefs({ muted });
	}

	syncMusicForVenue(venueId: string): void {
		this.#venueId = venueId;
		const bedId = musicBedForVenue(venueId);
		const gain = effectiveMusicGain(this.prefs);

		if (!this.unlocked || gain <= 0) {
			if (this.#currentBed) {
				this.#player.stop(this.#currentBed);
			}
			this.#currentBed = null;
			return;
		}

		if (this.#currentBed && this.#currentBed !== bedId) {
			this.#player.stop(this.#currentBed);
		}
		this.#currentBed = bedId;
		this.#player.play(MUSIC_BEDS[bedId], gain);
	}

	stopMusic(): void {
		if (this.#currentBed) {
			this.#player.stop(this.#currentBed);
			this.#currentBed = null;
		}
	}

	onPhase(phase: GamePhase): void {
		this.#phase = phase;
		const gain = effectiveSfxGain(this.prefs);
		const next: 'work-pencil' | 'work-critique' | null =
			!this.unlocked || gain <= 0
				? null
				: phase === 'generating'
					? 'work-pencil'
					: phase === 'critiquing'
						? 'work-critique'
						: null;

		if (this.#workLoop && this.#workLoop !== next) {
			this.#player.stop(this.#workLoop);
		}
		this.#workLoop = next;
		if (next) {
			this.#player.play(SFX[next], gain);
		}
	}

	playCashStinger(): void {
		this.playSfx('stinger-cash');
	}

	playLevelUpStinger(): void {
		this.playSfx('stinger-levelup');
	}

	playSfx(id: SfxId): void {
		if (!this.unlocked) return;
		const gain = effectiveSfxGain(this.prefs);
		if (gain <= 0) return;
		this.#player.playOneShot(SFX[id], gain);
	}

	/** Tear down HTMLAudioElements. Safe to call on page destroy; singleton stays usable. */
	dispose(): void {
		this.#player.dispose();
		this.#player = new MuteSafePlayer({ AudioCtor: this.#AudioCtor });
		this.#currentBed = null;
		this.#workLoop = null;
	}

	#applyGains(): void {
		const musicGain = effectiveMusicGain(this.prefs);
		const sfxGain = effectiveSfxGain(this.prefs);
		if (this.#currentBed) {
			if (musicGain <= 0) {
				this.#player.stop(this.#currentBed);
				this.#currentBed = null;
			} else {
				this.#player.setVolume(this.#currentBed, musicGain);
			}
		}
		if (this.#workLoop) {
			if (sfxGain <= 0) {
				this.#player.stop(this.#workLoop);
				this.#workLoop = null;
			} else {
				this.#player.setVolume(this.#workLoop, sfxGain);
			}
		}
	}
}

/** Factory so unit tests can inject Audio constructors and prefs. */
export function createStudioAudio(options: CreateStudioAudioOptions = {}): StudioAudioController {
	return new StudioAudioImpl(options);
}

/**
 * Attach one-shot gesture unlock on window. Idempotent after unlock.
 * Returns a disposer that removes listeners if still pending.
 */
export function attachAudioUnlock(controller: StudioAudioController): () => void {
	if (typeof window === 'undefined') return () => {};
	if (controller.unlocked) return () => {};

	const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];

	const onGesture = () => {
		controller.unlock();
		detach();
	};

	const detach = () => {
		for (const type of events) {
			window.removeEventListener(type, onGesture, true);
		}
	};

	for (const type of events) {
		window.addEventListener(type, onGesture, { capture: true, once: false });
	}

	return detach;
}

/** App singleton — +page and GameMenuBar share one pipeline. */
export const studioAudio: StudioAudioController = createStudioAudio();
