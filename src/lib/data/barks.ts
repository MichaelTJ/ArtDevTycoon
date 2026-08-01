/** Who may speak a bark. Staff ids match STAFF_ROLES / hiredRoleIds. */
export type BarkSpeakerId = 'mum' | 'apprentice' | 'curator' | 'marketing-director' | 'visitor'; // reserved; unused in MVP

export interface BarkLine {
	/** Stable id for tests and dedupe. */
	id: string;
	speaker: BarkSpeakerId;
	/** One line, ≤ 42 chars. Comedy, kitchen-safe, no spoilers of modifiers. */
	text: string;
	/**
	 * Optional audio cue id for Spec 21c later. 21e MAY forward this string;
	 * MUST NOT load or play audio itself.
	 */
	cueId?: string;
}

export const BARK_POOL: readonly BarkLine[] = [
	// Mum — kitchen resident (MVP baseline; ≥ 8 lines)
	{ id: 'mum-01', speaker: 'mum', text: "Don't forget lunch.", cueId: 'bark.mum.01' },
	{ id: 'mum-02', speaker: 'mum', text: 'The fridge is judging you.', cueId: 'bark.mum.02' },
	{ id: 'mum-03', speaker: 'mum', text: 'Paint something nice, love.' },
	{ id: 'mum-04', speaker: 'mum', text: 'Is that supposed to be modern?' },
	{ id: 'mum-05', speaker: 'mum', text: 'Mind the wet floor.' },
	{ id: 'mum-06', speaker: 'mum', text: 'Your aunt would buy that.' },
	{ id: 'mum-07', speaker: 'mum', text: 'Tea first. Then genius.' },
	{ id: 'mum-08', speaker: 'mum', text: "I'm not posing for this." },

	// Staff — only eligible when hired + sprite present (21a)
	{ id: 'app-01', speaker: 'apprentice', text: 'Another common. Got it.' },
	{ id: 'app-02', speaker: 'apprentice', text: 'Do I get a lunch break?' },
	{ id: 'cur-01', speaker: 'curator', text: 'Hang it higher. Trust me.' },
	{ id: 'cur-02', speaker: 'curator', text: 'The lighting is… intentional.' },
	{ id: 'md-01', speaker: 'marketing-director', text: 'I already invited someone.' },
	{ id: 'md-02', speaker: 'marketing-director', text: 'Smile. Foot traffic.' }
] as const;

export function linesForSpeaker(speaker: BarkSpeakerId): readonly BarkLine[] {
	return BARK_POOL.filter((b) => b.speaker === speaker);
}

/** Human label for live region / captions. */
export function barkSpeakerLabel(speaker: BarkSpeakerId): string {
	switch (speaker) {
		case 'mum':
			return 'Mum';
		case 'apprentice':
			return 'Apprentice';
		case 'curator':
			return 'Curator';
		case 'marketing-director':
			return 'Marketing Director';
		case 'visitor':
			return 'Visitor';
	}
}
