import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TeamRoster from './TeamRoster.svelte';

test('lists catalog artists and hire button', async () => {
	const screen = render(TeamRoster, {
		hired: [],
		cash: 100,
		reputation: 10,
		onhire: vi.fn(),
		onfire: vi.fn(),
		onclose: vi.fn()
	});
	await expect.element(screen.getByText('Jade Ink')).toBeVisible();
	await expect.element(screen.getByText('Sam Storyboard')).toBeVisible();
});

test('hired artist shows level and release', async () => {
	const onfire = vi.fn();
	const screen = render(TeamRoster, {
		hired: [{ catalogId: 'jade-ink', xp: 40, mediumSkillXp: {} }],
		cash: 100,
		reputation: 10,
		onhire: vi.fn(),
		onfire,
		onclose: vi.fn()
	});
	await expect.element(screen.getByText('Level 2')).toBeVisible();
	await screen.getByRole('button', { name: 'Release Jade Ink' }).click();
	expect(onfire).toHaveBeenCalledWith('jade-ink');
});

test('hired artist medium ranks show Doodler for pencil at 60 XP', async () => {
	const screen = render(TeamRoster, {
		hired: [{ catalogId: 'jade-ink', xp: 40, mediumSkillXp: { pencil: 60 } }],
		cash: 100,
		reputation: 10,
		onhire: vi.fn(),
		onfire: vi.fn(),
		onclose: vi.fn()
	});
	await expect.element(screen.getByText(/Pencil · Doodler/)).toBeVisible();
});
