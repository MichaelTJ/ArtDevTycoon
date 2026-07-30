import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WorkspaceZoneHarness from './WorkspaceZone.harness.svelte';

test('renders children snippet content', async () => {
	const screen = render(WorkspaceZoneHarness);
	await expect.element(screen.getByText('Workspace content')).toBeVisible();
});
