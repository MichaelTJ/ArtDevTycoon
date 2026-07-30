/**
 * Purchasable gallery layouts — curation style that multiplies payout and styles the grid.
 * Switchable once unlocked (unlike venues, which are linear upgrades only).
 */

export interface GalleryLayout {
	id: string;
	name: string;
	tagline: string;
	unlockCost: number;
	/** Multiplies payout. 1.0 = no change. */
	curationMultiplier: number;
	/** CSS class applied to the gallery grid. */
	gridClassName: string;
	icon: string;
}

export const GALLERY_LAYOUTS: readonly GalleryLayout[] = [
	{
		id: 'cluttered',
		name: 'Cluttered Corkboard',
		tagline: 'Everything, everywhere, tilted.',
		unlockCost: 0,
		curationMultiplier: 1.0,
		gridClassName: 'layout-cluttered',
		icon: '📌'
	},
	{
		id: 'tidy-rows',
		name: 'Tidy Rows',
		tagline: 'At least it is straight now.',
		unlockCost: 300,
		curationMultiplier: 1.05,
		gridClassName: 'layout-rows',
		icon: '📏'
	},
	{
		id: 'salon-hang',
		name: 'Salon Hang',
		tagline: 'Floor-to-ceiling, gallery-style.',
		unlockCost: 800,
		curationMultiplier: 1.1,
		gridClassName: 'layout-salon',
		icon: '🖼️'
	},
	{
		id: 'grid-gallery',
		name: 'Perfect Grid',
		tagline: 'Even spacing, even lighting.',
		unlockCost: 2000,
		curationMultiplier: 1.2,
		gridClassName: 'layout-grid',
		icon: '▦'
	},
	{
		id: 'minimalist',
		name: 'Minimalist White Cube',
		tagline: 'One piece at a time, reverently lit.',
		unlockCost: 4500,
		curationMultiplier: 1.35,
		gridClassName: 'layout-minimalist',
		icon: '⬜'
	}
] as const;

export const DEFAULT_LAYOUT_ID = GALLERY_LAYOUTS[0].id;

export function getLayout(id: string): GalleryLayout {
	return GALLERY_LAYOUTS.find((l) => l.id === id) ?? GALLERY_LAYOUTS[0];
}

export function canUnlockLayout(layout: GalleryLayout, cash: number): boolean {
	return cash >= layout.unlockCost;
}
