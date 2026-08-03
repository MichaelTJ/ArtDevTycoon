import { describe, expect, it } from 'vitest';
import {
	captureMumRealCritique,
	isMumCommission,
	MUM_DISPLAY_SCORE,
	MUM_PAYOUT_CASH,
	MUM_REPUTATION_GAIN,
	mumSkillGains,
	pickMumPraiseLine,
	praiseSeedFromArtworkId
} from './mumCritiquePresentation';

describe('mumCritiquePresentation', () => {
	it('identifies Mum by client name', () => {
		expect(isMumCommission('Mum')).toBe(true);
		expect(isMumCommission('Neighbour')).toBe(false);
	});

	it('captures engine scores before display override', () => {
		const real = captureMumRealCritique(
			{
				title: 'Wobbly Cat',
				accuracyScore: 2,
				criticReview: 'The paws are facing the wrong way.'
			},
			4
		);
		expect(real).toEqual({
			title: 'Wobbly Cat',
			accuracyScore: 2,
			creativityScore: 4,
			criticReview: 'The paws are facing the wrong way.'
		});
	});

	it('uses max score constant for Mum display', () => {
		expect(MUM_DISPLAY_SCORE).toBe(10);
	});

	it('fixes Mum cash payout at $5', () => {
		expect(MUM_PAYOUT_CASH).toBe(5);
	});

	it('grants max reputation for 10/10 Mum scores', () => {
		expect(MUM_REPUTATION_GAIN).toBe(3);
	});

	it('grants max skill XP clamps for Mum', () => {
		expect(mumSkillGains()).toEqual({ prompting: 10, imagination: 10, hustle: 20 });
	});

	it('praiseSeedFromArtworkId is stable for the same id', () => {
		expect(praiseSeedFromArtworkId('art-42')).toBe(praiseSeedFromArtworkId('art-42'));
	});

	it('pickMumPraiseLine returns pool text for a seed', () => {
		expect(pickMumPraiseLine(0)).toContain('Wow!');
	});
});
