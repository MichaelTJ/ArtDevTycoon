/** Phaser registry key — `true` while a DOM text control has focus. */
export const STUDIO_DOM_EDITABLE_FOCUSED_KEY = 'domEditableFocused';

interface DomFocusNode {
	tagName: string;
	getAttribute(name: string): string | null;
	closest(selector: string): Element | null;
	isContentEditable?: boolean;
}

function isFocusNode(el: unknown): el is DomFocusNode {
	return (
		typeof el === 'object' &&
		el !== null &&
		'tagName' in el &&
		typeof (el as DomFocusNode).getAttribute === 'function' &&
		typeof (el as DomFocusNode).closest === 'function'
	);
}

/**
 * Whether `el` is a focus target that should steal keyboard from the studio floor
 * (prompt fields, toolkit search, etc.).
 */
export function isDomEditableElement(el: Element | null | undefined): boolean {
	if (!isFocusNode(el)) return false;

	const contentEditable = el.closest('[contenteditable]');
	if (isFocusNode(contentEditable)) {
		const mode = contentEditable.getAttribute('contenteditable');
		if (mode !== 'false') return true;
	}

	const tag = el.tagName;
	if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
	if (tag === 'INPUT') return true;

	return false;
}

/** True when `document.activeElement` is an editable DOM control. */
export function isDomEditableFocused(doc: Pick<Document, 'activeElement'> = document): boolean {
	return isDomEditableElement(doc.activeElement);
}
