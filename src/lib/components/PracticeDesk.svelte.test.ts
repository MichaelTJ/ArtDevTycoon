import { mediumSkillProgress } from '$lib/game';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PracticeDesk from './PracticeDesk.svelte';

const crayonNovice = mediumSkillProgress('crayon', 0);
const pencilDoodler = mediumSkillProgress('pencil', 60);

test('renders rank text and practice canvas', async () => {
	const screen = render(PracticeDesk, {
		mediumTierId: 'crayon',
		unlockedMediumTierIds: ['crayon'],
		cash: 0,
		reputation: 0,
		skill: crayonNovice,
		onselectmedium: vi.fn(),
		onpracticetick: vi.fn(),
		ondone: vi.fn()
	});

	await expect.element(screen.getByRole('region', { name: 'Practice desk' })).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Practice' })).toBeVisible();
	await expect
		.element(screen.getByText(/Crayons & Construction Paper · Novice · 0\/60 XP/))
		.toBeVisible();
	await expect.element(screen.getByLabelText('Practice canvas')).toBeVisible();
	await expect.element(screen.getByText('Medium progress')).toBeVisible();
});

test('Done fires ondone', async () => {
	const ondone = vi.fn();
	const screen = render(PracticeDesk, {
		mediumTierId: 'crayon',
		unlockedMediumTierIds: ['crayon'],
		cash: 0,
		reputation: 0,
		skill: crayonNovice,
		onselectmedium: vi.fn(),
		onpracticetick: vi.fn(),
		ondone
	});

	await screen.getByRole('button', { name: 'Finish practising' }).click();
	expect(ondone).toHaveBeenCalledTimes(1);
});

test('unlocked inactive medium fires onselectmedium', async () => {
	const onselectmedium = vi.fn();
	const screen = render(PracticeDesk, {
		mediumTierId: 'crayon',
		unlockedMediumTierIds: ['crayon', 'pencil'],
		cash: 25,
		reputation: 3,
		skill: crayonNovice,
		onselectmedium,
		onpracticetick: vi.fn(),
		ondone: vi.fn()
	});

	await screen.getByRole('button', { name: /Pencil & Sketchbook/i }).click();
	expect(onselectmedium).toHaveBeenCalledWith('pencil');
});

test('locked medium is disabled', async () => {
	const screen = render(PracticeDesk, {
		mediumTierId: 'crayon',
		unlockedMediumTierIds: ['crayon'],
		cash: 0,
		reputation: 0,
		skill: crayonNovice,
		onselectmedium: vi.fn(),
		onpracticetick: vi.fn(),
		ondone: vi.fn()
	});

	const inkBtn = screen.getByRole('button', { name: /Ink & Charcoal — Need/i });
	await expect.element(inkBtn).toBeDisabled();
});

test('max level copy when xpForNext is 0', async () => {
	const master = mediumSkillProgress('crayon', 810);
	const screen = render(PracticeDesk, {
		mediumTierId: 'crayon',
		unlockedMediumTierIds: ['crayon'],
		cash: 0,
		reputation: 0,
		skill: master,
		onselectmedium: vi.fn(),
		onpracticetick: vi.fn(),
		ondone: vi.fn()
	});

	await expect
		.element(screen.getByText(/Crayons & Construction Paper · Master · Max level/))
		.toBeVisible();
});

test('rank-up live region shows the new rank', async () => {
	const screen = render(PracticeDesk, {
		mediumTierId: 'pencil',
		unlockedMediumTierIds: ['crayon', 'pencil'],
		cash: 25,
		reputation: 3,
		skill: pencilDoodler,
		rankUpLabel: 'Doodler',
		onselectmedium: vi.fn(),
		onpracticetick: vi.fn(),
		ondone: vi.fn()
	});

	await expect.element(screen.getByText('Rank up — Doodler')).toBeVisible();
});

test('oil medium shows Oil on Canvas brush kinds', async () => {
	const screen = render(PracticeDesk, {
		mediumTierId: 'oil',
		unlockedMediumTierIds: ['crayon', 'oil'],
		cash: 350,
		reputation: 24,
		skill: mediumSkillProgress('oil', 0),
		onselectmedium: vi.fn(),
		onpracticetick: vi.fn(),
		ondone: vi.fn()
	});

	await expect.element(screen.getByRole('group', { name: 'Oil brush' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Round' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Bristle' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Flat' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Palette knife' })).toBeVisible();
});
