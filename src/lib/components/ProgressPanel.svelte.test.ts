import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { NextUnlock, SkillProgress } from '$lib/game';
import ProgressPanel from './ProgressPanel.svelte';

const commissions: NextUnlock = {
	track: 'commissions',
	label: 'Commissions',
	current: 2,
	target: 5,
	fill: 0.4,
	remainingLabel: '3 more commissions'
};

const cashMeter: NextUnlock = {
	track: 'cash',
	label: 'Cash goal',
	current: 100,
	target: 50,
	fill: 0.2,
	remainingLabel: '$400 more'
};

const reputationMeter: NextUnlock = {
	track: 'reputation',
	label: 'Pencil & Sketchbook',
	current: 0,
	target: 3,
	fill: 0,
	remainingLabel: '3 more reputation'
};

const skills: SkillProgress[] = [
	{
		id: 'prompting',
		label: 'Prompting',
		xp: 0,
		level: 1,
		xpIntoLevel: 0,
		xpForNext: 15,
		fill: 0
	},
	{
		id: 'imagination',
		label: 'Imagination',
		xp: 0,
		level: 1,
		xpIntoLevel: 0,
		xpForNext: 15,
		fill: 0
	},
	{
		id: 'hustle',
		label: 'Hustle',
		xp: 0,
		level: 1,
		xpIntoLevel: 0,
		xpForNext: 15,
		fill: 0
	}
];

test('lists career standing and craft sections', async () => {
	const onclose = vi.fn();
	const screen = render(ProgressPanel, {
		cash: 100,
		reputation: 0,
		commissions,
		cashMeter,
		reputationMeter,
		skills,
		onclose
	});

	await expect.element(screen.getByRole('dialog', { name: 'Progress' })).toBeVisible();
	await expect.element(screen.getByText('Career')).toBeVisible();
	await expect.element(screen.getByText('Standing')).toBeVisible();
	await expect.element(screen.getByText('Craft skills')).toBeVisible();
	await expect.element(screen.getByText('Prompting')).toBeVisible();
	await expect.element(screen.getByText(/Hitting the brief/)).toBeVisible();
	await expect.element(screen.getByText(/Cash \$100 · Reputation 0/)).toBeVisible();
	await expect.element(screen.getByRole('progressbar', { name: /Reputation/ })).toBeVisible();

	await screen.getByRole('button', { name: 'Close progress' }).click();
	expect(onclose).toHaveBeenCalledOnce();
});
