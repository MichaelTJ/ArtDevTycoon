import { describe, expect, it } from 'vitest';
import { isDomEditableElement, isDomEditableFocused } from './domInputFocus';

function walkAncestors(node: MockFocusNode): MockFocusNode[] {
	const out: MockFocusNode[] = [];
	for (let cur: MockFocusNode | null = node; cur; cur = cur.parent) {
		out.push(cur);
	}
	return out;
}

class MockFocusNode {
	tagName: string;
	parent: MockFocusNode | null = null;
	#attrs = new Map<string, string>();

	constructor(tag: string, attrs: Record<string, string> = {}) {
		this.tagName = tag.toUpperCase();
		for (const [key, value] of Object.entries(attrs)) {
			this.#attrs.set(key, value);
		}
	}

	appendChild(child: MockFocusNode): MockFocusNode {
		child.parent = this;
		return child;
	}

	getAttribute(name: string): string | null {
		return this.#attrs.get(name) ?? null;
	}

	closest(selector: string): Element | null {
		for (const cur of walkAncestors(this)) {
			if (!selector.startsWith('[contenteditable')) continue;
			const mode = cur.getAttribute('contenteditable');
			if (mode === null) continue;
			if (selector.includes(':not([contenteditable="false"])')) {
				if (mode !== 'false') return cur as unknown as Element;
			} else {
				return cur as unknown as Element;
			}
		}
		return null;
	}
}

function asElement(node: MockFocusNode): Element {
	return node as unknown as Element;
}

describe('isDomEditableElement', () => {
	it('matches text inputs, textarea, and select', () => {
		expect(isDomEditableElement(asElement(new MockFocusNode('input')))).toBe(true);
		expect(isDomEditableElement(asElement(new MockFocusNode('textarea')))).toBe(true);
		expect(isDomEditableElement(asElement(new MockFocusNode('select')))).toBe(true);
	});

	it('matches contenteditable regions', () => {
		const div = new MockFocusNode('div', { contenteditable: 'true' });
		expect(isDomEditableElement(asElement(div))).toBe(true);

		const child = div.appendChild(new MockFocusNode('span'));
		expect(isDomEditableElement(asElement(child))).toBe(true);
	});

	it('ignores contenteditable=false and non-editable nodes', () => {
		const locked = new MockFocusNode('div', { contenteditable: 'false' });
		expect(isDomEditableElement(asElement(locked))).toBe(false);

		expect(isDomEditableElement(asElement(new MockFocusNode('button')))).toBe(false);
		expect(isDomEditableElement(asElement(new MockFocusNode('div')))).toBe(false);
		expect(isDomEditableElement(null)).toBe(false);
	});
});

describe('isDomEditableFocused', () => {
	it('reflects activeElement from an injected document', () => {
		const input = asElement(new MockFocusNode('input'));
		const button = asElement(new MockFocusNode('button'));
		expect(isDomEditableFocused({ activeElement: input })).toBe(true);
		expect(isDomEditableFocused({ activeElement: button })).toBe(false);
		expect(isDomEditableFocused({ activeElement: null })).toBe(false);
	});
});
