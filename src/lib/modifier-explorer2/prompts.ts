import { RARITY_LABELS } from './types';
import type {
	ExplorerPromptCase,
	FlavorFacet,
	ModifierCategory,
	PromptFacets,
	RarityBand
} from './types';

/**
 * Explorer2 prompt series — wipe-and-replace, not the old axis ladder.
 *
 * Round 1: 100 objects × 3 shots. Prompt is "A detailed sketch of {object}".
 *
 * Round 2: style modifiers × 10 working objects (edit `WORKING_SUBJECT_KEYS` after Round 1).
 *
 * Round 3: 9 tiered sketch styles × 5 objects each — variety within each art type.
 *
 * Round 4: 6 art-medium categories × 7 tiers × 5 objects — full basic→master progression.
 *
 * Round 5: retry the Round 4 styles Janus failed, with texture-first suffixes.
 *
 * Round 6: background ladder v1. One shot per medium × skill tier, backdrop matched
 * to that tier (white canvas at 1–3, studio at 4–5, dramatic depth at 6–7).
 *
 * Round 7: background ladder v2 — progressive studio quality (flat → shadow →
 * softbox → bokeh → three-point lighting).
 */

export const EXPLORER_CATEGORY_LABELS: Record<ModifierCategory, string> = {
	'round1-objects': 'Round 1 — Objects (common → rare)',
	'round2-simple': 'Round 2 — Style modifiers',
	'round3-sketch-tiers': 'Round 3 — Sketch tiers',
	'round4-art-tiers': 'Round 4 — Art medium tiers',
	'round5-retries': 'Round 5 — Failed-tier retries',
	'round6-backgrounds': 'Round 6 — Background tiers',
	'round7-backgrounds': 'Round 7 — Background tiers v2',
	custom: 'Custom prompt'
};

interface SubjectOption {
	key: string;
	label: string;
	phrase: string;
	rarity: RarityBand;
}

/** 100 objects ordered common → very-rare. Keys are stable good-tag ids. */
export const ROUND1_SUBJECTS: readonly SubjectOption[] = [
	// —— Common (25) —— everyday nouns, high training-data frequency
	{ key: 'apple', label: 'Apple', phrase: 'a red apple', rarity: 'common' },
	{ key: 'banana', label: 'Banana', phrase: 'a yellow banana', rarity: 'common' },
	{ key: 'orange', label: 'Orange', phrase: 'an orange fruit', rarity: 'common' },
	{ key: 'coffee-mug', label: 'Coffee mug', phrase: 'a ceramic coffee mug', rarity: 'common' },
	{ key: 'teacup', label: 'Teacup', phrase: 'a porcelain teacup', rarity: 'common' },
	{ key: 'book', label: 'Book', phrase: 'a closed hardcover book', rarity: 'common' },
	{ key: 'chair', label: 'Chair', phrase: 'a wooden chair', rarity: 'common' },
	{ key: 'table', label: 'Table', phrase: 'a simple wooden table', rarity: 'common' },
	{ key: 'lamp', label: 'Lamp', phrase: 'a desk lamp', rarity: 'common' },
	{ key: 'candle', label: 'Candle', phrase: 'a lit candle', rarity: 'common' },
	{ key: 'cat', label: 'Cat', phrase: 'a house cat', rarity: 'common' },
	{ key: 'dog', label: 'Dog', phrase: 'a dog', rarity: 'common' },
	{ key: 'bird', label: 'Bird', phrase: 'a small bird', rarity: 'common' },
	{ key: 'fish', label: 'Fish', phrase: 'a goldfish', rarity: 'common' },
	{ key: 'car', label: 'Car', phrase: 'a passenger car', rarity: 'common' },
	{ key: 'bicycle', label: 'Bicycle', phrase: 'a bicycle', rarity: 'common' },
	{ key: 'tree', label: 'Tree', phrase: 'a leafy tree', rarity: 'common' },
	{ key: 'flower', label: 'Flower', phrase: 'a flower', rarity: 'common' },
	{ key: 'house', label: 'House', phrase: 'a small house', rarity: 'common' },
	{ key: 'sun', label: 'Sun', phrase: 'the sun', rarity: 'common' },
	{ key: 'ball', label: 'Ball', phrase: 'a rubber ball', rarity: 'common' },
	{ key: 'shoe', label: 'Shoe', phrase: 'a shoe', rarity: 'common' },
	{ key: 'bottle', label: 'Bottle', phrase: 'a glass bottle', rarity: 'common' },
	{ key: 'clock', label: 'Clock', phrase: 'an analog clock', rarity: 'common' },
	{ key: 'key', label: 'Key', phrase: 'a metal key', rarity: 'common' },

	// —— Uncommon (25) —— recognizable but less default
	{ key: 'violin', label: 'Violin', phrase: 'a violin', rarity: 'uncommon' },
	{ key: 'guitar', label: 'Guitar', phrase: 'an acoustic guitar', rarity: 'uncommon' },
	{ key: 'piano', label: 'Piano', phrase: 'a grand piano', rarity: 'uncommon' },
	{ key: 'microscope', label: 'Microscope', phrase: 'a microscope', rarity: 'uncommon' },
	{ key: 'telescope', label: 'Telescope', phrase: 'a telescope', rarity: 'uncommon' },
	{ key: 'typewriter', label: 'Typewriter', phrase: 'a vintage typewriter', rarity: 'uncommon' },
	{ key: 'compass', label: 'Compass', phrase: 'a magnetic compass', rarity: 'uncommon' },
	{ key: 'hourglass', label: 'Hourglass', phrase: 'an hourglass', rarity: 'uncommon' },
	{ key: 'lighthouse', label: 'Lighthouse', phrase: 'a lighthouse', rarity: 'uncommon' },
	{ key: 'windmill', label: 'Windmill', phrase: 'a windmill', rarity: 'uncommon' },
	{ key: 'cactus', label: 'Cactus', phrase: 'a potted cactus', rarity: 'uncommon' },
	{ key: 'pineapple', label: 'Pineapple', phrase: 'a pineapple', rarity: 'uncommon' },
	{ key: 'seahorse', label: 'Seahorse', phrase: 'a seahorse', rarity: 'uncommon' },
	{ key: 'octopus', label: 'Octopus', phrase: 'an octopus', rarity: 'uncommon' },
	{ key: 'penguin', label: 'Penguin', phrase: 'a penguin', rarity: 'uncommon' },
	{ key: 'giraffe', label: 'Giraffe', phrase: 'a giraffe', rarity: 'uncommon' },
	{ key: 'elephant', label: 'Elephant', phrase: 'an elephant', rarity: 'uncommon' },
	{ key: 'umbrella', label: 'Umbrella', phrase: 'an open umbrella', rarity: 'uncommon' },
	{ key: 'backpack', label: 'Backpack', phrase: 'a backpack', rarity: 'uncommon' },
	{ key: 'scissors', label: 'Scissors', phrase: 'a pair of scissors', rarity: 'uncommon' },
	{ key: 'hammer', label: 'Hammer', phrase: 'a claw hammer', rarity: 'uncommon' },
	{ key: 'wrench', label: 'Wrench', phrase: 'a metal wrench', rarity: 'uncommon' },
	{ key: 'paintbrush', label: 'Paintbrush', phrase: 'a paintbrush', rarity: 'uncommon' },
	{ key: 'easel', label: 'Easel', phrase: 'an artist easel', rarity: 'uncommon' },
	{ key: 'camera', label: 'Camera', phrase: 'a vintage camera', rarity: 'uncommon' },

	// —— Rare (25) —— specific / less-photographed
	{ key: 'narwhal', label: 'Narwhal', phrase: 'a narwhal', rarity: 'rare' },
	{ key: 'platypus', label: 'Platypus', phrase: 'a platypus', rarity: 'rare' },
	{ key: 'axolotl', label: 'Axolotl', phrase: 'an axolotl', rarity: 'rare' },
	{ key: 'pangolin', label: 'Pangolin', phrase: 'a pangolin', rarity: 'rare' },
	{ key: 'quokka', label: 'Quokka', phrase: 'a quokka', rarity: 'rare' },
	{ key: 'tapir', label: 'Tapir', phrase: 'a tapir', rarity: 'rare' },
	{ key: 'armadillo', label: 'Armadillo', phrase: 'an armadillo', rarity: 'rare' },
	{ key: 'chameleon', label: 'Chameleon', phrase: 'a chameleon', rarity: 'rare' },
	{ key: 'cassowary', label: 'Cassowary', phrase: 'a cassowary', rarity: 'rare' },
	{ key: 'mandrill', label: 'Mandrill', phrase: 'a mandrill', rarity: 'rare' },
	{ key: 'nautilus', label: 'Nautilus', phrase: 'a chambered nautilus shell', rarity: 'rare' },
	{ key: 'trilobite', label: 'Trilobite', phrase: 'a trilobite fossil', rarity: 'rare' },
	{ key: 'astrolabe', label: 'Astrolabe', phrase: 'a brass astrolabe', rarity: 'rare' },
	{ key: 'sextant', label: 'Sextant', phrase: 'a navigational sextant', rarity: 'rare' },
	{ key: 'orrery', label: 'Orrery', phrase: 'a mechanical orrery', rarity: 'rare' },
	{ key: 'theremin', label: 'Theremin', phrase: 'a theremin instrument', rarity: 'rare' },
	{ key: 'didgeridoo', label: 'Didgeridoo', phrase: 'a didgeridoo', rarity: 'rare' },
	{ key: 'samovar', label: 'Samovar', phrase: 'a brass samovar', rarity: 'rare' },
	{ key: 'trebuchet', label: 'Trebuchet', phrase: 'a medieval trebuchet', rarity: 'rare' },
	{ key: 'kaleidoscope', label: 'Kaleidoscope', phrase: 'a kaleidoscope', rarity: 'rare' },
	{ key: 'gramophone', label: 'Gramophone', phrase: 'a gramophone with horn', rarity: 'rare' },
	{ key: 'abacus', label: 'Abacus', phrase: 'a wooden abacus', rarity: 'rare' },
	{
		key: 'origami-crane',
		label: 'Origami crane',
		phrase: 'a folded origami crane',
		rarity: 'rare'
	},
	{ key: 'sushi-platter', label: 'Sushi platter', phrase: 'a sushi platter', rarity: 'rare' },
	{
		key: 'hot-air-balloon',
		label: 'Hot-air balloon',
		phrase: 'a hot air balloon',
		rarity: 'rare'
	},

	// —— Very rare (25) —— obscure / archaic / culturally specific
	{ key: 'quagga', label: 'Quagga', phrase: 'a quagga', rarity: 'very-rare' },
	{ key: 'thylacine', label: 'Thylacine', phrase: 'a thylacine', rarity: 'very-rare' },
	{ key: 'dodo', label: 'Dodo', phrase: 'a dodo bird', rarity: 'very-rare' },
	{
		key: 'archaeopteryx',
		label: 'Archaeopteryx',
		phrase: 'an archaeopteryx',
		rarity: 'very-rare'
	},
	{ key: 'ammonite', label: 'Ammonite', phrase: 'an ammonite fossil', rarity: 'very-rare' },
	{
		key: 'antikythera',
		label: 'Antikythera',
		phrase: 'the Antikythera mechanism',
		rarity: 'very-rare'
	},
	{ key: 'faberge-egg', label: 'Fabergé egg', phrase: 'a Fabergé egg', rarity: 'very-rare' },
	{ key: 'shakuhachi', label: 'Shakuhachi', phrase: 'a shakuhachi flute', rarity: 'very-rare' },
	{ key: 'erhu', label: 'Erhu', phrase: 'an erhu', rarity: 'very-rare' },
	{ key: 'qanun', label: 'Qanun', phrase: 'a qanun zither', rarity: 'very-rare' },
	{ key: 'balalaika', label: 'Balalaika', phrase: 'a balalaika', rarity: 'very-rare' },
	{ key: 'ocarina', label: 'Ocarina', phrase: 'an ocarina', rarity: 'very-rare' },
	{ key: 'ziggurat', label: 'Ziggurat', phrase: 'a Mesopotamian ziggurat', rarity: 'very-rare' },
	{ key: 'menhir', label: 'Menhir', phrase: 'a standing menhir stone', rarity: 'very-rare' },
	{ key: 'quipu', label: 'Quipu', phrase: 'an Incan quipu', rarity: 'very-rare' },
	{
		key: 'cloisonne-vase',
		label: 'Cloisonné vase',
		phrase: 'a cloisonné vase',
		rarity: 'very-rare'
	},
	{ key: 'netsuke', label: 'Netsuke', phrase: 'a carved netsuke', rarity: 'very-rare' },
	{ key: 'shisa', label: 'Shisa', phrase: 'an Okinawan shisa lion', rarity: 'very-rare' },
	{
		key: 'sand-mandala',
		label: 'Sand mandala',
		phrase: 'a Tibetan sand mandala',
		rarity: 'very-rare'
	},
	{ key: 'reliquary', label: 'Reliquary', phrase: 'a medieval reliquary', rarity: 'very-rare' },
	{ key: 'censer', label: 'Censer', phrase: 'an incense censer', rarity: 'very-rare' },
	{
		key: 'astrolabe-mariner',
		label: 'Mariner astrolabe',
		phrase: 'a mariner astrolabe',
		rarity: 'very-rare'
	},
	{ key: 'orrery-pocket', label: 'Pocket orrery', phrase: 'a pocket orrery', rarity: 'very-rare' },
	{
		key: 'wootz-dagger',
		label: 'Wootz dagger',
		phrase: 'a wootz steel dagger',
		rarity: 'very-rare'
	},
	{
		key: 'kimono-stand',
		label: 'Kimono stand',
		phrase: 'a kimono on a display stand',
		rarity: 'very-rare'
	}
];

/**
 * After Round 1, replace these keys with subjects you marked good.
 * Round 2 runs every style modifier against each of these objects.
 */
export const WORKING_SUBJECT_KEYS: readonly string[] = [
	'apple',
	'banana',
	'orange',
	'coffee-mug',
	'cat',
	'dog',
	'chair',
	'book',
	'lamp',
	'flower'
];

interface StyleModifier {
	key: string;
	label: string;
	phrase: string;
}

/** Style prefix modifiers — each is paired with every working subject. */
export const ROUND2_STYLE_MODIFIERS: readonly StyleModifier[] = [
	{ key: 'rough-sketch', label: 'Rough sketch', phrase: 'A rough sketch of' },
	{ key: 'detailed-sketch', label: 'Detailed sketch', phrase: 'A highly detailed sketch of' },
	{ key: 'charcoal', label: 'Charcoal drawing', phrase: 'A charcoal drawing of' },
	{
		key: 'detailed-portrait',
		label: 'Detailed portrait',
		phrase: 'A highly detailed portrait of'
	},
	{ key: 'oil-painting', label: 'Oil painting', phrase: 'An oil painting of' },
	{
		key: 'childlike-crayon',
		label: 'Childlike crayon',
		phrase: 'A childlike crayon or pencil drawing of'
	},
	{ key: 'digital-painting', label: 'Digital painting', phrase: 'A digital painting of' }
];

export type SketchTier = 'basic' | 'intermediate' | 'advanced';

const SKETCH_TIER_LABELS: Record<SketchTier, string> = {
	basic: 'Basic',
	intermediate: 'Intermediate',
	advanced: 'Advanced'
};

interface Round3SketchStyle {
	key: string;
	label: string;
	phrase: string;
	tier: SketchTier;
}

/** Tiered sketch styles — 5 objects each for variety within the art type. */
export const ROUND3_SKETCH_STYLES: readonly Round3SketchStyle[] = [
	{
		key: 'continuous-line',
		label: 'Continuous line drawing',
		phrase: 'continuous line drawing',
		tier: 'basic'
	},
	{ key: 'gesture-sketch', label: 'Gesture sketch', phrase: 'gesture sketch', tier: 'basic' },
	{
		key: 'rough-thumbnail',
		label: 'Rough thumbnail sketch',
		phrase: 'rough thumbnail sketch',
		tier: 'basic'
	},
	{
		key: 'contour-line',
		label: 'Contour line drawing',
		phrase: 'contour line drawing',
		tier: 'intermediate'
	},
	{
		key: 'cross-hatched-ink',
		label: 'Cross-hatched ink sketch',
		phrase: 'cross-hatched ink sketch',
		tier: 'intermediate'
	},
	{
		key: 'architectural-draft',
		label: 'Architectural draft sketch',
		phrase: 'architectural draft sketch',
		tier: 'intermediate'
	},
	{
		key: 'scientific-botanical',
		label: 'Scientific botanical illustration',
		phrase: 'scientific botanical illustration',
		tier: 'advanced'
	},
	{ key: 'stippling', label: 'Stippling art', phrase: 'stippling art', tier: 'advanced' },
	{
		key: 'fine-liner-pen',
		label: 'Fine liner pen illustration',
		phrase: 'fine liner pen illustration',
		tier: 'advanced'
	}
];

export const ROUND3_OBJECTS_PER_STYLE = 5;

export interface Round4ArtCategory {
	key: string;
	label: string;
}

export interface Round4ArtStyle {
	key: string;
	label: string;
	phrase: string;
	categoryKey: string;
	tier: number;
}

export const ROUND4_ART_CATEGORIES: readonly Round4ArtCategory[] = [
	{ key: 'crayons-construction', label: 'Crayons & Construction Paper' },
	{ key: 'pencil-sketchbook', label: 'Pencil & Sketchbook' },
	{ key: 'ink-charcoal', label: 'Ink & Charcoal' },
	{ key: 'acrylic-digital', label: 'Acrylic & Digital Tablet' },
	{ key: 'oil-canvas', label: 'Oil on Canvas' },
	{
		key: 'watercolor-alternatives',
		label: 'Watercolor Alternatives (Gouache, Copic, Soft Pastel)'
	}
];

/** Seven tiers per medium category — 5 objects each (same layout as Round 3). */
export const ROUND4_ART_STYLES: readonly Round4ArtStyle[] = [
	// Category 1 — Crayons & Construction Paper
	{
		key: 'crayon-scribble-outside-lines',
		label: 'Childlike wax crayon scribble, outside the lines',
		phrase: 'childlike wax crayon scribble, outside the lines',
		categoryKey: 'crayons-construction',
		tier: 1
	},
	{
		key: 'construction-paper-collage',
		label: 'Clunky construction paper collage cutout',
		phrase: 'clunky construction paper collage cutout',
		categoryKey: 'crayons-construction',
		tier: 2
	},
	{
		key: 'wobbly-wax-crayon',
		label: 'Heavy, wobbly wax crayon drawing',
		phrase: 'heavy, wobbly wax crayon drawing',
		categoryKey: 'crayons-construction',
		tier: 3
	},
	{
		key: 'smeared-oil-pastel',
		label: 'Smeared oil pastel drawing, basic shapes',
		phrase: 'smeared oil pastel drawing, basic shapes',
		categoryKey: 'crayons-construction',
		tier: 4
	},
	{
		key: 'neat-wax-crayon-outlines',
		label: 'Neatly colored wax crayon drawing, thick outlines',
		phrase: 'neatly colored wax crayon drawing, thick outlines',
		categoryKey: 'crayons-construction',
		tier: 5
	},
	{
		key: 'blended-wax-crayon',
		label: 'Blended wax crayon illustration, textured',
		phrase: 'blended wax crayon illustration, textured',
		categoryKey: 'crayons-construction',
		tier: 6
	},
	{
		key: 'expert-wax-pastel',
		label: 'Highly detailed wax pastel illustration, expert crayon art',
		phrase: 'highly detailed wax pastel illustration, expert crayon art',
		categoryKey: 'crayons-construction',
		tier: 7
	},
	// Category 2 — Pencil & Sketchbook
	{
		key: 'messy-continuous-graphite',
		label: 'Messy continuous line graphite drawing',
		phrase: 'messy continuous line graphite drawing',
		categoryKey: 'pencil-sketchbook',
		tier: 1
	},
	{
		key: 'quick-gesture-sketch',
		label: 'Quick, loose gesture sketch',
		phrase: 'quick, loose gesture sketch',
		categoryKey: 'pencil-sketchbook',
		tier: 2
	},
	{
		key: 'rough-thumbnail-construction',
		label: 'Rough thumbnail sketch, visible construction lines',
		phrase: 'rough thumbnail sketch, visible construction lines',
		categoryKey: 'pencil-sketchbook',
		tier: 3
	},
	{
		key: 'basic-contour-graphite',
		label: 'Basic contour line drawing',
		phrase: 'basic contour line drawing',
		categoryKey: 'pencil-sketchbook',
		tier: 4
	},
	{
		key: 'light-graphite-shade',
		label: 'Lightly shaded graphite pencil sketch',
		phrase: 'lightly shaded graphite pencil sketch',
		categoryKey: 'pencil-sketchbook',
		tier: 5
	},
	{
		key: 'precise-architectural-graphite',
		label: 'Precise architectural draft sketch',
		phrase: 'precise architectural draft sketch',
		categoryKey: 'pencil-sketchbook',
		tier: 6
	},
	{
		key: 'botanical-graphite',
		label: 'Hyper-detailed scientific botanical illustration in graphite',
		phrase: 'hyper-detailed scientific botanical illustration in graphite',
		categoryKey: 'pencil-sketchbook',
		tier: 7
	},
	// Category 3 — Ink & Charcoal
	{
		key: 'chaotic-charcoal-scribble',
		label: 'Smudged, chaotic charcoal scribble',
		phrase: 'smudged, chaotic charcoal scribble',
		categoryKey: 'ink-charcoal',
		tier: 1
	},
	{
		key: 'heavy-charcoal',
		label: 'Heavy, blunt charcoal drawing',
		phrase: 'heavy, blunt charcoal drawing',
		categoryKey: 'ink-charcoal',
		tier: 2
	},
	{
		key: 'ballpoint-scratch',
		label: 'Quick ballpoint pen sketch, scratchy lines',
		phrase: 'quick ballpoint pen sketch, scratchy lines',
		categoryKey: 'ink-charcoal',
		tier: 3
	},
	{
		key: 'black-ink-outline',
		label: 'Simple black ink outline drawing',
		phrase: 'simple black ink outline drawing',
		categoryKey: 'ink-charcoal',
		tier: 4
	},
	{
		key: 'ink-brush-wash',
		label: 'Loose black ink and brush wash',
		phrase: 'loose black ink and brush wash',
		categoryKey: 'ink-charcoal',
		tier: 5
	},
	{
		key: 'cross-hatched-ink-precise',
		label: 'Precise cross-hatched ink sketch',
		phrase: 'precise cross-hatched ink sketch',
		categoryKey: 'ink-charcoal',
		tier: 6
	},
	{
		key: 'fine-liner-stipple',
		label: 'Ultra-fine liner pen illustration, stippled shading',
		phrase: 'ultra-fine liner pen illustration, stippled shading',
		categoryKey: 'ink-charcoal',
		tier: 7
	},
	// Category 4 — Acrylic & Digital Tablet
	{
		key: 'ms-paint-pixel',
		label: 'MS Paint style pixelated drawing, flat colors',
		phrase: 'MS Paint style pixelated drawing, flat colors',
		categoryKey: 'acrylic-digital',
		tier: 1
	},
	{
		key: 'flat-vector-basic',
		label: 'Basic flat vector art, no shading',
		phrase: 'basic flat vector art, no shading',
		categoryKey: 'acrylic-digital',
		tier: 2
	},
	{
		key: 'cell-shaded-digital',
		label: 'Simple cell-shaded digital illustration',
		phrase: 'simple cell-shaded digital illustration',
		categoryKey: 'acrylic-digital',
		tier: 3
	},
	{
		key: 'acrylic-brushstrokes',
		label: 'Clean acrylic painting, visible brushstrokes',
		phrase: 'clean acrylic painting, visible brushstrokes',
		categoryKey: 'acrylic-digital',
		tier: 4
	},
	{
		key: 'flat-digital-minimal',
		label: 'Crisp flat digital illustration, minimal gradients',
		phrase: 'crisp flat digital illustration, minimal gradients',
		categoryKey: 'acrylic-digital',
		tier: 5
	},
	{
		key: 'isometric-digital',
		label: 'High-contrast isometric digital art',
		phrase: 'high-contrast isometric digital art',
		categoryKey: 'acrylic-digital',
		tier: 6
	},
	{
		key: 'vector-25d-polished',
		label: 'Polished 2.5D vector art style, smooth gradients',
		phrase: 'polished 2.5D vector art style, smooth gradients',
		categoryKey: 'acrylic-digital',
		tier: 7
	},
	// Category 5 — Oil on Canvas
	{
		key: 'finger-painted-oil',
		label: 'Finger-painted oil sketch, messy daubs',
		phrase: 'finger-painted oil sketch, messy daubs',
		categoryKey: 'oil-canvas',
		tier: 1
	},
	{
		key: 'alla-prima-oil',
		label: 'Quick alla prima oil sketch',
		phrase: 'quick alla prima oil sketch',
		categoryKey: 'oil-canvas',
		tier: 2
	},
	{
		key: 'palette-knife-oil',
		label: 'Palette knife oil painting, chunky textures',
		phrase: 'palette knife oil painting, chunky textures',
		categoryKey: 'oil-canvas',
		tier: 3
	},
	{
		key: 'impressionist-oil',
		label: 'Loose impressionist oil painting',
		phrase: 'loose impressionist oil painting',
		categoryKey: 'oil-canvas',
		tier: 4
	},
	{
		key: 'impasto-oil',
		label: 'Impasto oil on canvas, thick 3D paint strokes',
		phrase: 'impasto oil on canvas, thick 3D paint strokes',
		categoryKey: 'oil-canvas',
		tier: 5
	},
	{
		key: 'classical-still-life-oil',
		label: 'Classical still life oil painting',
		phrase: 'classical still life oil painting',
		categoryKey: 'oil-canvas',
		tier: 6
	},
	{
		key: 'chiaroscuro-oil',
		label: 'Masterful chiaroscuro oil painting, rich museum quality',
		phrase: 'masterful chiaroscuro oil painting, rich museum quality',
		categoryKey: 'oil-canvas',
		tier: 7
	},
	// Category 6 — Watercolor Alternatives
	{
		key: 'chalk-pastel-scribble',
		label: 'Messy chalk pastel scribble',
		phrase: 'messy chalk pastel scribble',
		categoryKey: 'watercolor-alternatives',
		tier: 1
	},
	{
		key: 'flat-copic-sketch',
		label: 'Basic flat copic marker sketch',
		phrase: 'basic flat copic marker sketch',
		categoryKey: 'watercolor-alternatives',
		tier: 2
	},
	{
		key: 'loose-gouache',
		label: 'Loose gouache sketch, uneven washes',
		phrase: 'loose gouache sketch, uneven washes',
		categoryKey: 'watercolor-alternatives',
		tier: 3
	},
	{
		key: 'blended-chalk-pastel',
		label: 'Blended soft chalk pastel drawing',
		phrase: 'blended soft chalk pastel drawing',
		categoryKey: 'watercolor-alternatives',
		tier: 4
	},
	{
		key: 'clean-copic',
		label: 'Clean copic marker illustration, crisp edges',
		phrase: 'clean copic marker illustration, crisp edges',
		categoryKey: 'watercolor-alternatives',
		tier: 5
	},
	{
		key: 'matte-gouache',
		label: 'Detailed matte gouache painting',
		phrase: 'detailed matte gouache painting',
		categoryKey: 'watercolor-alternatives',
		tier: 6
	},
	{
		key: 'master-gouache',
		label: 'Masterful opaque gouache illustration, studio quality',
		phrase: 'masterful opaque gouache illustration, studio quality',
		categoryKey: 'watercolor-alternatives',
		tier: 7
	}
];

export const ROUND4_OBJECTS_PER_STYLE = 5;

export interface Round5RetryStyle {
	key: string;
	label: string;
	phrase: string;
	categoryKey: string;
	tier: number;
	/** Round 4 style this retry replaces — same five objects for A/B. */
	replacesKey: string;
}

/**
 * Round 4 styles Janus failed. New phrases keep the same skill rank but drop
 * geometry/construction language (collage, isometric, architectural, botanical,
 * cross-hatch, finger-paint) in favour of medium texture.
 */
export const ROUND5_RETRY_STYLES: readonly Round5RetryStyle[] = [
	{
		key: 'clumsy-crayon-construction',
		label: 'Clumsy crayon coloring on construction paper',
		phrase: 'clumsy crayon coloring on construction paper, chunky wax strokes, torn paper',
		categoryKey: 'crayons-construction',
		tier: 2,
		replacesKey: 'construction-paper-collage'
	},
	{
		key: 'detailed-graphite-study',
		label: 'Highly detailed graphite pencil drawing',
		phrase: 'highly detailed graphite pencil drawing, fine shading, professional sketchbook study',
		categoryKey: 'pencil-sketchbook',
		tier: 6,
		replacesKey: 'precise-architectural-graphite'
	},
	{
		key: 'masterful-graphite',
		label: 'Masterful graphite pencil drawing',
		phrase: 'masterful graphite pencil drawing, museum-quality shading, intricate detail',
		categoryKey: 'pencil-sketchbook',
		tier: 7,
		replacesKey: 'botanical-graphite'
	},
	{
		key: 'detailed-ink-illustration',
		label: 'Detailed black ink illustration',
		phrase: 'detailed black ink illustration, confident linework, rich ink shadows',
		categoryKey: 'ink-charcoal',
		tier: 6,
		replacesKey: 'cross-hatched-ink-precise'
	},
	{
		key: 'polished-digital-painting',
		label: 'Polished digital painting, rich blended color',
		phrase: 'polished digital painting, rich blended color, professional tablet illustration',
		categoryKey: 'acrylic-digital',
		tier: 6,
		replacesKey: 'isometric-digital'
	},
	{
		key: 'muddy-amateur-oil',
		label: 'Beginner oil painting, muddy colors',
		phrase: 'beginner oil painting, muddy colors, amateur canvas, thick messy paint',
		categoryKey: 'oil-canvas',
		tier: 1,
		replacesKey: 'finger-painted-oil'
	}
];

export interface Round6Background {
	key: string;
	label: string;
	phrase: string;
	tier: number;
}

/** Studio lighting / canvas ladder — no specific locations, so subjects stay interchangeable. */
export const ROUND6_BACKGROUNDS: readonly Round6Background[] = [
	{
		key: 'plain-white',
		label: 'Solid plain white',
		phrase: 'on a solid plain white background',
		tier: 1
	},
	{
		key: 'stark-white',
		label: 'Stark white',
		phrase: 'centered on a stark white background',
		tier: 2
	},
	{
		key: 'off-white-paper',
		label: 'Off-white paper texture',
		phrase: 'isolated on a smooth off-white paper texture background',
		tier: 3
	},
	{
		key: 'grey-gradient',
		label: 'Soft grey gradient',
		phrase: 'centered against a soft neutral grey gradient background',
		tier: 4
	},
	{
		key: 'studio-rim',
		label: 'Polished studio rim light',
		phrase: 'on a polished solid studio background with soft rim lighting',
		tier: 5
	},
	{
		key: 'dark-bokeh',
		label: 'Dark bokeh backdrop',
		phrase: 'against a dark dramatic backdrop with soft out-of-focus background bokeh',
		tier: 6
	},
	{
		key: 'dramatic-studio',
		label: 'Dramatic studio atmosphere',
		phrase:
			'centered in a dark dramatic studio setting with moody atmospheric lighting and soft radial depth',
		tier: 7
	}
];

export interface Round7Background {
	key: string;
	label: string;
	phrase: string;
	tier: number;
}

/** Progressive studio-quality backdrops — flat canvas up through three-point lighting. */
export const ROUND7_BACKGROUNDS: readonly Round7Background[] = [
	{
		key: 'unfinished-flat',
		label: 'Unfinished / flat',
		phrase: 'centered on a solid plain white background',
		tier: 1
	},
	{
		key: 'clean-canvas',
		label: 'Clean canvas',
		phrase: 'centered on clean textured paper background',
		tier: 2
	},
	{
		key: 'basic-grounding',
		label: 'Basic grounding',
		phrase: 'against a light studio backdrop with a soft drop shadow',
		tier: 3
	},
	{
		key: 'diffused-value',
		label: 'Diffused value',
		phrase: 'against a soft neutral gradient background with diffused lighting',
		tier: 4
	},
	{
		key: 'crisp-studio',
		label: 'Crisp studio',
		phrase: 'in a bright studio setup with clean softbox lighting and sharp focus',
		tier: 5
	},
	{
		key: 'depth-separation',
		label: 'Depth separation',
		phrase: 'against a smooth neutral background with soft out-of-focus blur',
		tier: 6
	},
	{
		key: 'master-presentation',
		label: 'Master presentation',
		phrase:
			'in a bright professional studio setup with three-point lighting and soft background bokeh',
		tier: 7
	}
];

const ROUND4_CATEGORY_BY_KEY = new Map(ROUND4_ART_CATEGORIES.map((c) => [c.key, c]));

function artTierLabel(tier: number): string {
	return `Tier ${tier}`;
}

function objectNounForPrompt(subjectPhrase: string): string {
	return subjectPhrase.replace(/^(a|an|the) /i, '');
}

function round1Prompt(subjectPhrase: string): string {
	return `A detailed sketch of ${subjectPhrase}`;
}

function isolatedObjectStylePrompt(subjectPhrase: string, stylePhrase: string): string {
	return `A single ${objectNounForPrompt(subjectPhrase)}, ${stylePhrase}, centered on a plain white background.`;
}

function isolatedObjectBackdropPrompt(
	subjectPhrase: string,
	stylePhrase: string,
	backgroundPhrase: string
): string {
	return `A single ${objectNounForPrompt(subjectPhrase)}, ${stylePhrase}, ${backgroundPhrase}.`;
}

function subjectsForStyleIndex(styleIndex: number, count: number): SubjectOption[] {
	const subjects: SubjectOption[] = [];
	const start = styleIndex * count;
	for (let i = 0; i < count; i += 1) {
		subjects.push(ROUND1_SUBJECTS[(start + i) % ROUND1_SUBJECTS.length] as SubjectOption);
	}
	return subjects;
}

/** Three generation attempts per object; same prompt each time. */
const ROUND1_VARIANTS: readonly { key: string; label: string }[] = [
	{ key: 'v0', label: 'Shot 1' },
	{ key: 'v1', label: 'Shot 2' },
	{ key: 'v2', label: 'Shot 3' }
];

function facet(key: string, label: string): FlavorFacet {
	return { key, label };
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40);
}

function allocateId(usedIds: Set<string>, base: string): string {
	let id = base.slice(0, 96);
	if (!usedIds.has(id)) {
		usedIds.add(id);
		return id;
	}
	let n = 2;
	while (usedIds.has(`${id}-${n}`)) n += 1;
	id = `${id}-${n}`;
	usedIds.add(id);
	return id;
}

function makeCase(
	usedIds: Set<string>,
	input: {
		category: ModifierCategory;
		idParts: string[];
		modifier: string;
		subject: string;
		prompt: string;
		facets: PromptFacets;
	}
): ExplorerPromptCase {
	const base = [input.category, ...input.idParts].join('-');
	return {
		id: allocateId(usedIds, base),
		category: input.category,
		categoryLabel: EXPLORER_CATEGORY_LABELS[input.category],
		modifier: input.modifier,
		subject: input.subject,
		prompt: input.prompt,
		facets: input.facets
	};
}

function buildRound1(usedIds: Set<string>): ExplorerPromptCase[] {
	const cases: ExplorerPromptCase[] = [];
	for (const subject of ROUND1_SUBJECTS) {
		for (const variant of ROUND1_VARIANTS) {
			cases.push(
				makeCase(usedIds, {
					category: 'round1-objects',
					idParts: [subject.rarity, subject.key, variant.key],
					modifier: `${RARITY_LABELS[subject.rarity]} · ${subject.label} · ${variant.label}`,
					subject: subject.phrase,
					prompt: round1Prompt(subject.phrase),
					facets: {
						round: facet('round1', 'Round 1'),
						subject: facet(subject.key, subject.label),
						rarity: facet(subject.rarity, RARITY_LABELS[subject.rarity]),
						variant: facet(variant.key, variant.label)
					}
				})
			);
		}
	}
	return cases;
}

function resolveWorkingSubjects(): SubjectOption[] {
	const byKey = new Map(ROUND1_SUBJECTS.map((s) => [s.key, s]));
	const resolved = WORKING_SUBJECT_KEYS.map((key) => byKey.get(key)).filter(
		(s): s is SubjectOption => s !== undefined
	);
	if (resolved.length === 0) {
		return ROUND1_SUBJECTS.slice(0, 10) as SubjectOption[];
	}
	return resolved;
}

function round2Prompt(modifierPhrase: string, subjectPhrase: string): string {
	return `${modifierPhrase} ${subjectPhrase}`;
}

function buildRound2(usedIds: Set<string>): ExplorerPromptCase[] {
	const working = resolveWorkingSubjects();
	const cases: ExplorerPromptCase[] = [];

	for (const style of ROUND2_STYLE_MODIFIERS) {
		for (const subject of working) {
			cases.push(
				makeCase(usedIds, {
					category: 'round2-simple',
					idParts: [style.key, subject.key],
					modifier: `${style.label} · ${subject.label}`,
					subject: subject.phrase,
					prompt: round2Prompt(style.phrase, subject.phrase),
					facets: {
						round: facet('round2', 'Round 2'),
						subject: facet(subject.key, subject.label),
						style: facet(style.key, style.label),
						variant: facet('v0', 'Single shot')
					}
				})
			);
		}
	}

	return cases;
}

function buildRound3(usedIds: Set<string>): ExplorerPromptCase[] {
	const cases: ExplorerPromptCase[] = [];

	ROUND3_SKETCH_STYLES.forEach((style, styleIndex) => {
		for (const subject of subjectsForStyleIndex(styleIndex, ROUND3_OBJECTS_PER_STYLE)) {
			cases.push(
				makeCase(usedIds, {
					category: 'round3-sketch-tiers',
					idParts: [style.key, subject.key],
					modifier: `${SKETCH_TIER_LABELS[style.tier]} · ${style.label} · ${subject.label}`,
					subject: subject.phrase,
					prompt: isolatedObjectStylePrompt(subject.phrase, style.phrase),
					facets: {
						round: facet('round3', 'Round 3'),
						subject: facet(subject.key, subject.label),
						style: facet(style.key, style.label),
						variant: facet('v0', 'Single shot')
					}
				})
			);
		}
	});

	return cases;
}

function buildRound4(usedIds: Set<string>): ExplorerPromptCase[] {
	const cases: ExplorerPromptCase[] = [];

	ROUND4_ART_STYLES.forEach((style, styleIndex) => {
		const category = ROUND4_CATEGORY_BY_KEY.get(style.categoryKey);
		if (!category) {
			return;
		}

		for (const subject of subjectsForStyleIndex(
			ROUND3_SKETCH_STYLES.length + styleIndex,
			ROUND4_OBJECTS_PER_STYLE
		)) {
			cases.push(
				makeCase(usedIds, {
					category: 'round4-art-tiers',
					idParts: [style.categoryKey, `t${style.tier}`, style.key, subject.key],
					modifier: `${category.label} · ${artTierLabel(style.tier)} · ${style.label} · ${subject.label}`,
					subject: subject.phrase,
					prompt: isolatedObjectStylePrompt(subject.phrase, style.phrase),
					facets: {
						round: facet('round4', 'Round 4'),
						subject: facet(subject.key, subject.label),
						medium: facet(category.key, category.label),
						style: facet(style.key, style.label),
						variant: facet('v0', 'Single shot')
					}
				})
			);
		}
	});

	return cases;
}

function subjectsForReplacedRound4Style(replacesKey: string): SubjectOption[] {
	const styleIndex = ROUND4_ART_STYLES.findIndex((style) => style.key === replacesKey);
	return subjectsForStyleIndex(
		ROUND3_SKETCH_STYLES.length + Math.max(styleIndex, 0),
		ROUND4_OBJECTS_PER_STYLE
	);
}

function buildRound5(usedIds: Set<string>): ExplorerPromptCase[] {
	const cases: ExplorerPromptCase[] = [];

	for (const style of ROUND5_RETRY_STYLES) {
		const category = ROUND4_CATEGORY_BY_KEY.get(style.categoryKey);
		if (!category) {
			continue;
		}

		for (const subject of subjectsForReplacedRound4Style(style.replacesKey)) {
			cases.push(
				makeCase(usedIds, {
					category: 'round5-retries',
					idParts: [style.categoryKey, `t${style.tier}`, style.key, subject.key],
					modifier: `${category.label} · ${artTierLabel(style.tier)} retry · ${style.label} · ${subject.label}`,
					subject: subject.phrase,
					prompt: isolatedObjectStylePrompt(subject.phrase, style.phrase),
					facets: {
						round: facet('round5', 'Round 5'),
						subject: facet(subject.key, subject.label),
						medium: facet(category.key, category.label),
						style: facet(style.key, style.label),
						variant: facet('v0', 'Retry')
					}
				})
			);
		}
	}

	return cases;
}

function workingArtStyle(round4Style: Round4ArtStyle): {
	key: string;
	label: string;
	phrase: string;
} {
	const retry = ROUND5_RETRY_STYLES.find((style) => style.replacesKey === round4Style.key);
	return retry ?? round4Style;
}

function buildBackgroundRound(
	usedIds: Set<string>,
	input: {
		category: 'round6-backgrounds' | 'round7-backgrounds';
		roundKey: string;
		roundLabel: string;
		backgrounds: readonly { key: string; label: string; phrase: string; tier: number }[];
	}
): ExplorerPromptCase[] {
	const cases: ExplorerPromptCase[] = [];
	const workingSubjects = resolveWorkingSubjects();
	let cell = 0;

	for (const category of ROUND4_ART_CATEGORIES) {
		for (const background of input.backgrounds) {
			const round4Style = ROUND4_ART_STYLES.find(
				(style) => style.categoryKey === category.key && style.tier === background.tier
			);
			if (!round4Style) {
				continue;
			}

			const style = workingArtStyle(round4Style);
			const subject = workingSubjects[cell % workingSubjects.length] as SubjectOption;
			cell += 1;

			cases.push(
				makeCase(usedIds, {
					category: input.category,
					idParts: [category.key, `t${background.tier}`, style.key, background.key, subject.key],
					modifier: `${category.label} · ${artTierLabel(background.tier)} · ${style.label} · ${background.label} · ${subject.label}`,
					subject: subject.phrase,
					prompt: isolatedObjectBackdropPrompt(subject.phrase, style.phrase, background.phrase),
					facets: {
						round: facet(input.roundKey, input.roundLabel),
						subject: facet(subject.key, subject.label),
						medium: facet(category.key, category.label),
						style: facet(style.key, style.label),
						background: facet(background.key, background.label),
						variant: facet('v0', 'Single shot')
					}
				})
			);
		}
	}

	return cases;
}

function buildRound6(usedIds: Set<string>): ExplorerPromptCase[] {
	return buildBackgroundRound(usedIds, {
		category: 'round6-backgrounds',
		roundKey: 'round6',
		roundLabel: 'Round 6',
		backgrounds: ROUND6_BACKGROUNDS
	});
}

function buildRound7(usedIds: Set<string>): ExplorerPromptCase[] {
	return buildBackgroundRound(usedIds, {
		category: 'round7-backgrounds',
		roundKey: 'round7',
		roundLabel: 'Round 7',
		backgrounds: ROUND7_BACKGROUNDS
	});
}

/** One-off typed prompt — saved to the gallery with category `custom`. */
export function buildCustomPromptCase(prompt: string, usedIds: Set<string>): ExplorerPromptCase {
	const trimmed = prompt.trim();
	const slug = slugify(trimmed) || 'prompt';
	const label = trimmed.length > 48 ? `${trimmed.slice(0, 45)}…` : trimmed;
	return makeCase(usedIds, {
		category: 'custom',
		idParts: [slug, String(Date.now())],
		modifier: 'Custom prompt',
		subject: trimmed,
		prompt: trimmed,
		facets: {
			round: facet('custom', 'Custom'),
			subject: facet(slug, label),
			variant: facet('v0', 'Custom')
		}
	});
}

function buildAllCases(): ExplorerPromptCase[] {
	const usedIds = new Set<string>();
	return [
		...buildRound1(usedIds),
		...buildRound2(usedIds),
		...buildRound3(usedIds),
		...buildRound4(usedIds),
		...buildRound5(usedIds),
		...buildRound6(usedIds),
		...buildRound7(usedIds)
	];
}

export const EXPLORER_PROMPT_CASES: readonly ExplorerPromptCase[] = buildAllCases();
export const EXPLORER_CASE_COUNT = EXPLORER_PROMPT_CASES.length;

export const ROUND1_CASE_COUNT = EXPLORER_PROMPT_CASES.filter(
	(c) => c.category === 'round1-objects'
).length;
export const ROUND2_CASE_COUNT = EXPLORER_PROMPT_CASES.filter(
	(c) => c.category === 'round2-simple'
).length;
export const ROUND3_CASE_COUNT = EXPLORER_PROMPT_CASES.filter(
	(c) => c.category === 'round3-sketch-tiers'
).length;
export const ROUND4_CASE_COUNT = EXPLORER_PROMPT_CASES.filter(
	(c) => c.category === 'round4-art-tiers'
).length;
export const ROUND5_CASE_COUNT = EXPLORER_PROMPT_CASES.filter(
	(c) => c.category === 'round5-retries'
).length;
export const ROUND6_CASE_COUNT = EXPLORER_PROMPT_CASES.filter(
	(c) => c.category === 'round6-backgrounds'
).length;
export const ROUND7_CASE_COUNT = EXPLORER_PROMPT_CASES.filter(
	(c) => c.category === 'round7-backgrounds'
).length;
