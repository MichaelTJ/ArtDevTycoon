/** Critic review templates banded by accuracy score. Placeholders: {client}, {missed}, {matched}. */
export const REVIEW_TEMPLATES = {
	poor: [
		'{client} squints at this for a long moment. Whatever it is, it is not what they asked for.',
		'Technically a picture. The brief mentioned {missed}, and this does not.',
		'Bold of you to submit this. {client} is too polite to say more.',
		'A confident answer to a question nobody asked.'
	],
	middling: [
		'It gestures at {matched}, which is something. {client} expected a little more.',
		'Competent, in the way a shrug is competent.',
		'The idea is in there somewhere, buried under the crayon.',
		'{client} nods slowly. Not displeased. Not pleased.'
	],
	good: [
		'A charming, if slightly unrefined, take on {matched}.',
		'{client} smiles. The amateur texture is almost part of the appeal.',
		'Genuinely pleasant work. The brief has been served.',
		'Rough around the edges, but the heart of it is right.'
	],
	excellent: [
		'{client} is delighted. Every note of the brief is here.',
		'Astonishing, given the budget and the crayons. A small triumph.',
		'This is exactly what {client} pictured, and slightly better.',
		'The kitchen table has produced something genuinely good.'
	]
} as const;

export type ReviewBand = keyof typeof REVIEW_TEMPLATES;

/** Map an accuracy score to the template band used for critic copy. */
export function bandForScore(accuracyScore: number): ReviewBand {
	if (accuracyScore <= 3) return 'poor';
	if (accuracyScore <= 6) return 'middling';
	if (accuracyScore <= 8) return 'good';
	return 'excellent';
}
