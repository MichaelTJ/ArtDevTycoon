export type MusicBedId = 'kitchen-hum' | 'garage-bed' | 'storefront-bed' | 'museum-hush';

export type SfxId =
	| 'work-pencil' // loop while generating
	| 'work-critique' // loop while critiquing
	| 'stinger-cash' // one-shot Collect Cash
	| 'stinger-levelup'; // one-shot skill level-up

export interface AudioClip {
	id: string;
	/** Site-root URL under static/, e.g. `/studio/audio/beds/kitchen-hum.wav` */
	url: string;
	loop: boolean;
	bus: 'music' | 'sfx';
}

export const MUSIC_BEDS: Record<MusicBedId, AudioClip> = {
	'kitchen-hum': {
		id: 'kitchen-hum',
		url: '/studio/audio/beds/kitchen-hum.wav',
		loop: true,
		bus: 'music'
	},
	'garage-bed': {
		id: 'garage-bed',
		url: '/studio/audio/beds/garage-bed.wav',
		loop: true,
		bus: 'music'
	},
	'storefront-bed': {
		id: 'storefront-bed',
		url: '/studio/audio/beds/storefront-bed.wav',
		loop: true,
		bus: 'music'
	},
	'museum-hush': {
		id: 'museum-hush',
		url: '/studio/audio/beds/museum-hush.wav',
		loop: true,
		bus: 'music'
	}
};

export const SFX: Record<SfxId, AudioClip> = {
	'work-pencil': {
		id: 'work-pencil',
		url: '/studio/audio/sfx/work-pencil.wav',
		loop: true,
		bus: 'sfx'
	},
	'work-critique': {
		id: 'work-critique',
		url: '/studio/audio/sfx/work-critique.wav',
		loop: true,
		bus: 'sfx'
	},
	'stinger-cash': {
		id: 'stinger-cash',
		url: '/studio/audio/sfx/stinger-cash.wav',
		loop: false,
		bus: 'sfx'
	},
	'stinger-levelup': {
		id: 'stinger-levelup',
		url: '/studio/audio/sfx/stinger-levelup.wav',
		loop: false,
		bus: 'sfx'
	}
};

/** Venue id → bed. Unknown / missing → kitchen-hum. */
export function musicBedForVenue(venueId: string): MusicBedId {
	switch (venueId) {
		case 'fridge':
			return 'kitchen-hum';
		case 'garage':
			return 'garage-bed';
		case 'storefront':
			return 'storefront-bed';
		case 'gallery-hall':
		case 'mega-museum':
			return 'museum-hush';
		default:
			return 'kitchen-hum';
	}
}
