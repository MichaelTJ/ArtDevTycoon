import { MAJOR_PROJECTS } from '$lib/data/majorProjects';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MajorProjectPanel from './MajorProjectPanel.svelte';

test('lists available major projects', async () => {
	const screen = render(MajorProjectPanel, {
		reputation: 12,
		active: null,
		activeProject: null,
		crewOptions: [],
		onaccept: vi.fn(),
		onassigncrew: vi.fn(),
		onstartbeat: vi.fn(),
		oncollect: vi.fn(),
		onclose: vi.fn()
	});
	await expect.element(screen.getByText('The Lunch Legend')).toBeVisible();
	await expect.element(screen.getByText('Pencil Pals')).toBeVisible();
});

test('accept project fires onaccept', async () => {
	const onaccept = vi.fn();
	const screen = render(MajorProjectPanel, {
		reputation: 12,
		active: null,
		activeProject: null,
		crewOptions: [],
		onaccept,
		onassigncrew: vi.fn(),
		onstartbeat: vi.fn(),
		oncollect: vi.fn(),
		onclose: vi.fn()
	});
	await screen.getByRole('button', { name: 'Accept The Lunch Legend' }).click();
	expect(onaccept).toHaveBeenCalledWith(MAJOR_PROJECTS[0].id);
});
