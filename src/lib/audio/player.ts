import type { AudioClip } from './catalog';

/** Minimal surface we need from HTMLAudioElement (for Node test stubs). */
export interface AudioElementLike {
	src: string;
	loop: boolean;
	volume: number;
	paused: boolean;
	currentTime: number;
	play(): Promise<void>;
	pause(): void;
	load(): void;
}

export type AudioConstructor = new (src?: string) => AudioElementLike;

export interface MuteSafePlayerOptions {
	AudioCtor?: AudioConstructor;
}

/**
 * HTMLAudioElement pool. Every play/load failure is swallowed — commissions
 * must never break because a clip 404'd or autoplay was blocked.
 */
export class MuteSafePlayer {
	#AudioCtor: AudioConstructor | null;
	#elements = new Map<string, AudioElementLike>();

	constructor(options: MuteSafePlayerOptions = {}) {
		if (options.AudioCtor) {
			this.#AudioCtor = options.AudioCtor;
		} else if (typeof Audio !== 'undefined') {
			this.#AudioCtor = Audio as unknown as AudioConstructor;
		} else {
			this.#AudioCtor = null;
		}
	}

	#elementFor(clip: AudioClip): AudioElementLike | null {
		if (!this.#AudioCtor) return null;
		let el = this.#elements.get(clip.id);
		if (!el) {
			try {
				el = new this.#AudioCtor(clip.url);
				el.loop = clip.loop;
				this.#elements.set(clip.id, el);
			} catch {
				return null;
			}
		} else if (el.src !== clip.url && !el.src.endsWith(clip.url)) {
			try {
				el.src = clip.url;
				el.load();
			} catch {
				return null;
			}
		}
		el.loop = clip.loop;
		return el;
	}

	/**
	 * Start (or restart) a clip at the given gain. Gain 0 pauses without play spam.
	 * Rejecting `play()` is swallowed.
	 */
	play(clip: AudioClip, gain: number): void {
		const el = this.#elementFor(clip);
		if (!el) return;
		const vol = Math.min(1, Math.max(0, gain));
		el.volume = vol;
		if (vol <= 0) {
			try {
				el.pause();
			} catch {
				/* ignore */
			}
			return;
		}
		try {
			void el.play().catch(() => {
				/* missing file / NotAllowedError / decode — silent */
			});
		} catch {
			/* ignore */
		}
	}

	/** One-shot from the start. */
	playOneShot(clip: AudioClip, gain: number): void {
		const el = this.#elementFor(clip);
		if (!el) return;
		const vol = Math.min(1, Math.max(0, gain));
		if (vol <= 0) return;
		el.volume = vol;
		el.loop = false;
		try {
			el.currentTime = 0;
			void el.play().catch(() => {
				/* silent */
			});
		} catch {
			/* ignore */
		}
	}

	stop(clipId: string): void {
		const el = this.#elements.get(clipId);
		if (!el) return;
		try {
			el.pause();
			el.currentTime = 0;
		} catch {
			/* ignore */
		}
	}

	setVolume(clipId: string, gain: number): void {
		const el = this.#elements.get(clipId);
		if (!el) return;
		const vol = Math.min(1, Math.max(0, gain));
		el.volume = vol;
		if (vol <= 0) {
			try {
				el.pause();
			} catch {
				/* ignore */
			}
		}
	}

	dispose(): void {
		for (const el of this.#elements.values()) {
			try {
				el.pause();
				el.src = '';
			} catch {
				/* ignore */
			}
		}
		this.#elements.clear();
	}
}
