import { mediumSkillProgress } from '$lib/game';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PracticeDesk from './PracticeDesk.svelte';

const crayonNovice = mediumSkillProgress('crayon', 0);
const pencilDoodler = mediumSkillProgress('pencil', 30);

function deskProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		mediumTierId: 'crayon',
		unlockedMediumTierIds: ['crayon'],
		cash: 0,
		reputation: 0,
		skill: crayonNovice,
		practiceStrokeMs: 0,
		venueId: 'fridge',
		skillLevel: 1,
		onselectmedium: vi.fn(),
		onpracticetick: vi.fn(),
		onscrap: vi.fn(),
		onkeep: vi.fn(),
		...overrides
	};
}

test('renders rank text and practice canvas', async () => {
	const screen = render(PracticeDesk, deskProps());

	await expect.element(screen.getByRole('region', { name: 'Practice desk' })).toBeVisible();
	await expect.element(screen.getByRole('heading', { name: 'Practice' })).toBeVisible();
	await expect
		.element(screen.getByText(/Crayons & Construction Paper · Novice · 0\/30 XP/))
		.toBeVisible();
	await expect.element(screen.getByLabelText('Practice canvas')).toBeVisible();
	await expect.element(screen.getByText('Medium progress')).toBeVisible();
});

test('Scrap fires onscrap', async () => {
	const onscrap = vi.fn();
	const screen = render(PracticeDesk, deskProps({ onscrap }));

	await screen.getByRole('button', { name: 'Scrap this practice painting' }).click();
	expect(onscrap).toHaveBeenCalledTimes(1);
});

test('Keep is disabled when practiceStrokeMs is 0 and nothing is drawn', async () => {
	const screen = render(PracticeDesk, deskProps({ practiceStrokeMs: 0 }));
	await expect
		.element(screen.getByRole('button', { name: 'Keep this practice painting' }))
		.toBeDisabled();
	await expect.element(screen.getByText('Draw something first.')).toBeVisible();
});

test('Keep with 9000ms then Put in storage fires onkeep', async () => {
	const onkeep = vi.fn();
	const screen = render(
		PracticeDesk,
		deskProps({
			practiceStrokeMs: 9000,
			coverageOverride: 0.05,
			onkeep
		})
	);

	await screen.getByRole('button', { name: 'Keep this practice painting' }).click();
	await screen.getByRole('button', { name: 'Put in storage' }).click();
	expect(onkeep).toHaveBeenCalledWith(
		expect.objectContaining({ destination: 'storage', askingPrice: null })
	);
});

test('Keep with 9000ms then Hang in gallery fires onkeep', async () => {
	const onkeep = vi.fn();
	const screen = render(
		PracticeDesk,
		deskProps({
			practiceStrokeMs: 9000,
			coverageOverride: 0.05,
			onkeep
		})
	);

	await screen.getByRole('button', { name: 'Keep this practice painting' }).click();
	await screen.getByRole('button', { name: 'Add to gallery' }).click();
	await screen.getByRole('button', { name: 'Hang in gallery' }).click();
	expect(onkeep).toHaveBeenCalledWith(
		expect.objectContaining({ destination: 'gallery', askingPrice: 1 })
	);
});

test('default asking price at crayon fridge 90s coverage 0.4 is $2', async () => {
	const screen = render(
		PracticeDesk,
		deskProps({
			practiceStrokeMs: 90_000,
			coverageOverride: 0.4,
			skillLevel: 1,
			venueId: 'fridge',
			reputation: 0
		})
	);

	await screen.getByRole('button', { name: 'Keep this practice painting' }).click();
	await screen.getByRole('button', { name: 'Add to gallery' }).click();
	await expect.element(screen.getByText('Recommended price: $2')).toBeVisible();
	const input = screen.getByRole('spinbutton', { name: 'Asking price' });
	await expect.element(input).toHaveValue(2);
});

test('storefront watercolor coverage 0.25 / 45s / skill 4 / rep 12 recommends $22', async () => {
	const screen = render(
		PracticeDesk,
		deskProps({
			mediumTierId: 'watercolor',
			unlockedMediumTierIds: ['crayon', 'watercolor'],
			skill: mediumSkillProgress('watercolor', 90),
			practiceStrokeMs: 45_000,
			coverageOverride: 0.25,
			skillLevel: 4,
			venueId: 'storefront',
			reputation: 12
		})
	);

	await screen.getByRole('button', { name: 'Keep this practice painting' }).click();
	await screen.getByRole('button', { name: 'Add to gallery' }).click();
	await expect.element(screen.getByText('Recommended price: $22')).toBeVisible();
});

test('unlocked inactive medium fires onselectmedium', async () => {
	const onselectmedium = vi.fn();
	const screen = render(
		PracticeDesk,
		deskProps({
			unlockedMediumTierIds: ['crayon', 'pencil'],
			cash: 25,
			reputation: 3,
			onselectmedium
		})
	);

	await screen.getByRole('button', { name: /Pencil & Sketchbook/i }).click();
	expect(onselectmedium).toHaveBeenCalledWith('pencil');
});

test('locked medium is disabled', async () => {
	const screen = render(PracticeDesk, deskProps());

	const inkBtn = screen.getByRole('button', { name: /Ink & Charcoal — Need/i });
	await expect.element(inkBtn).toBeDisabled();
});

test('max level copy when xpForNext is 0', async () => {
	const master = mediumSkillProgress('crayon', 405);
	const screen = render(PracticeDesk, deskProps({ skill: master }));

	await expect
		.element(screen.getByText(/Crayons & Construction Paper · Master · Max level/))
		.toBeVisible();
});

test('rank-up live region shows the new rank', async () => {
	const screen = render(
		PracticeDesk,
		deskProps({
			mediumTierId: 'pencil',
			unlockedMediumTierIds: ['crayon', 'pencil'],
			cash: 25,
			reputation: 3,
			skill: pencilDoodler,
			rankUpLabel: 'Doodler'
		})
	);

	await expect.element(screen.getByText('Rank up — Doodler')).toBeVisible();
});

test('oil medium shows Oil on Canvas brush kinds', async () => {
	const screen = render(
		PracticeDesk,
		deskProps({
			mediumTierId: 'oil',
			unlockedMediumTierIds: ['crayon', 'oil'],
			cash: 350,
			reputation: 24,
			skill: mediumSkillProgress('oil', 0)
		})
	);

	await expect.element(screen.getByRole('group', { name: 'Oil brush' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Round' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Bristle' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Flat' })).toBeVisible();
	await expect.element(screen.getByRole('button', { name: 'Palette knife' })).toBeVisible();
});
