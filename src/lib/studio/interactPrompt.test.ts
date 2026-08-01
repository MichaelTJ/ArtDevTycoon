import { describe, expect, it } from 'vitest';
import {
	interactPromptLabel,
	prefersReducedMotion,
	type InteractPromptKind
} from './interactPrompt';

describe('interactPromptLabel', () => {
	it('registry label wins when non-empty after trim', () => {
		expect(interactPromptLabel({ kind: 'fridge', registryLabel: '  Open fridge  ' })).toBe(
			'Open fridge'
		);
		expect(interactPromptLabel({ kind: 'talk', clientName: 'Mum', registryLabel: 'Chat' })).toBe(
			'Chat'
		);
	});

	it('fallback table', () => {
		const cases: { kind: InteractPromptKind; clientName?: string | null; label: string }[] = [
			{ kind: 'talk', clientName: 'Mum', label: 'Talk to Mum' },
			{ kind: 'talk', clientName: 'Alex', label: 'Talk to Alex' },
			{ kind: 'talk', clientName: null, label: 'Talk' },
			{ kind: 'talk', clientName: '', label: 'Talk' },
			{ kind: 'deliver', clientName: 'Mum', label: 'Deliver to Mum' },
			{ kind: 'deliver', clientName: null, label: 'Deliver art' },
			{ kind: 'desk', label: 'Work at desk' },
			{ kind: 'easel', label: 'View art' },
			{ kind: 'look', label: 'View show' },
			{ kind: 'fridge', label: 'Open fridge' },
			{ kind: 'toolkit', label: 'Open toolkit' },
			{ kind: 'radio', label: 'Toggle radio' },
			{ kind: 'mail', label: 'Read mail' },
			{ kind: 'doorbell', label: 'Ring doorbell' },
			{ kind: 'prop', label: 'Inspect' }
		];
		for (const c of cases) {
			expect(interactPromptLabel({ kind: c.kind, clientName: c.clientName })).toBe(c.label);
		}
	});

	it('unknown kind → Interact', () => {
		expect(interactPromptLabel({ kind: 'not-a-kind' as InteractPromptKind })).toBe('Interact');
	});
});

describe('prefersReducedMotion', () => {
	it('reads matches from injected media', () => {
		expect(prefersReducedMotion({ matches: true })).toBe(true);
		expect(prefersReducedMotion({ matches: false })).toBe(false);
		expect(prefersReducedMotion(null)).toBe(false);
	});
});
