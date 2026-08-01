export {
	AUDIO_STORAGE_KEY,
	audioPrefsSchema,
	clamp01,
	createDefaultAudioPrefs,
	loadAudioPrefs,
	persistAudioPrefs,
	type AudioPrefs
} from './schema';

export {
	effectiveMusicGain,
	effectiveSfxGain,
	isAudioEnabled,
	skillXpBeforeCollect,
	skillsThatLeveledUp
} from './levels';

export {
	MUSIC_BEDS,
	SFX,
	musicBedForVenue,
	type AudioClip,
	type MusicBedId,
	type SfxId
} from './catalog';

export { MuteSafePlayer, type AudioConstructor, type AudioElementLike } from './player';

export {
	attachAudioUnlock,
	createStudioAudio,
	studioAudio,
	type CreateStudioAudioOptions,
	type StudioAudioController
} from './controller.svelte';
