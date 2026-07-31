import { AXIS_LEVEL_LABELS } from './types';
import type { AxisFacet, AxisLevel, ExplorerPromptCase, FlavorFacet, ModifierCategory, PromptFacets } from './types';

/**
 * Good prompts follow a set order: art style → main subject → lighting → fine details →
 * emotional mood → (optional) technical/camera cues. Each of the first four slots below is
 * an explicit 1→5 ladder from novice to expert, so any run can be sliced "beginner through
 * to expert" on exactly one axis while the rest stay fixed.
 */

interface StyleOption {
	key: string;
	label: string;
	level: AxisLevel;
}

const STYLE_OPTIONS: readonly StyleOption[] = [
	// 1 · Novice — kid-level scribbling, no control over the medium.
	{ key: 'crayon', label: 'a messy wax crayon drawing', level: 1 },
	{ key: 'fingerpaint', label: 'a smudged finger-painting', level: 1 },
	{ key: 'chalkscribble', label: 'a scribbly playground chalk drawing', level: 1 },
	// 2 · Beginner — learning basic linework, still loose and unsure.
	{ key: 'pencilsketch', label: 'a rough graphite pencil sketch', level: 2 },
	{ key: 'pendoodle', label: 'a shaky ballpoint pen doodle', level: 2 },
	{ key: 'charcoalrough', label: 'a loose charcoal sketch', level: 2 },
	// 3 · Intermediate — controlled line and flat color, student/hobbyist competence.
	{ key: 'flatdigital', label: 'a flat digital illustration', level: 3 },
	{ key: 'gouache', label: 'a gouache painting', level: 3 },
	{ key: 'inkwash', label: 'an ink wash painting', level: 3 },
	// 4 · Advanced — confident rendering with real material handling.
	{ key: 'watercolor', label: 'a detailed watercolor painting', level: 4 },
	{ key: 'coloredpencil', label: 'a richly rendered colored pencil illustration', level: 4 },
	{ key: 'acrylic', label: 'a layered acrylic painting', level: 4 },
	// 5 · Expert — museum-grade mastery of the medium.
	{ key: 'oilpainting', label: 'a masterful oil painting', level: 5 },
	{ key: 'hyperrealdigital', label: 'a hyperrealistic digital painting', level: 5 },
	{ key: 'photoreal', label: 'a photorealistic render', level: 5 }
];

interface SubjectOption {
	key: string;
	label: string;
	phrase: string;
	level: AxisLevel;
}

const SUBJECT_OPTIONS: readonly SubjectOption[] = [
	// 1 · Novice — a single static geometric/manufactured object, no pose to get wrong.
	{ key: 'cube', label: 'wooden cube', phrase: 'a plain wooden cube', level: 1 },
	{ key: 'mug', label: 'coffee mug', phrase: 'a plain ceramic coffee mug', level: 1 },
	{ key: 'bottle', label: 'glass bottle', phrase: 'a simple glass bottle', level: 1 },
	{ key: 'cone', label: 'ceramic cone', phrase: 'a smooth ceramic cone', level: 1 },
	// 2 · Beginner — simple organic still life, symmetric and motionless.
	{ key: 'apple', label: 'red apple', phrase: 'a single red apple', level: 2 },
	{ key: 'succulent', label: 'potted succulent', phrase: 'a small potted succulent', level: 2 },
	{ key: 'papercrane', label: 'paper crane', phrase: 'a folded paper crane', level: 2 },
	{ key: 'seashell', label: 'seashell', phrase: 'a spiral seashell', level: 2 },
	// 3 · Intermediate — a single figure at rest, believable but not dynamic.
	{ key: 'cat', label: 'sleeping cat', phrase: 'a cat curled up asleep', level: 3 },
	{ key: 'owl', label: 'perched owl', phrase: 'an owl perched quietly on a branch', level: 3 },
	{ key: 'reader', label: 'seated reader', phrase: 'an elderly man sitting and reading', level: 3 },
	{ key: 'fox', label: 'resting fox', phrase: 'a red fox resting in tall grass', level: 3 },
	{ key: 'violinist', label: 'seated violinist', phrase: 'a violinist sitting quietly with her instrument', level: 3 },
	{ key: 'knightstand', label: 'standing knight', phrase: 'a knight standing at ease in ornate armor', level: 3 },
	// 4 · Advanced — a clear pose or interaction between two elements.
	{ key: 'dogcatch', label: 'leaping dog', phrase: 'a dog leaping to catch a ball', level: 4 },
	{ key: 'handshake', label: 'handshake', phrase: 'two business partners shaking hands', level: 4 },
	{ key: 'horsetrot', label: 'trotting horse', phrase: 'a horse trotting across a field', level: 4 },
	{ key: 'climber', label: 'rock climber', phrase: 'a rock climber reaching for a hold', level: 4 },
	// 5 · Expert — complex dynamic action, foreshortening, multiple figures.
	{ key: 'flyingkick', label: 'flying kick', phrase: 'a martial artist mid flying-kick', level: 5 },
	{ key: 'balletleap', label: 'ballet leap', phrase: 'a ballet dancer leaping mid-air', level: 5 },
	{ key: 'marathon', label: 'marathon crowd', phrase: 'a dense crowd of marathon runners sprinting', level: 5 },
	{ key: 'swordfight', label: 'sword fight', phrase: 'two knights clashing swords in mid-battle', level: 5 }
];

interface LightingOption {
	key: string;
	label: string;
	level: AxisLevel;
}

const LIGHTING_OPTIONS: readonly LightingOption[] = [
	// 1 · Novice — no depth cue at all.
	{ key: 'flatoverhead', label: 'flat, shadowless overhead lighting', level: 1 },
	{ key: 'evenstudio', label: 'even studio lighting with no visible shadows', level: 1 },
	{ key: 'uniformbright', label: 'bright uniform lighting with no depth', level: 1 },
	// 2 · Beginner — one soft source, a first hint of shadow.
	{ key: 'softwindow', label: 'soft window light casting a gentle shadow', level: 2 },
	{ key: 'desklamp', label: 'a single desk lamp casting a soft shadow', level: 2 },
	{ key: 'overcastlight', label: 'soft overcast daylight', level: 2 },
	// 3 · Intermediate — clear direction, real highlight/shadow shaping.
	{ key: 'keylight', label: 'directional key lighting with defined highlights and shadows', level: 3 },
	{ key: 'threequarter', label: 'three-quarter side lighting', level: 3 },
	{ key: 'goldenhour', label: 'warm golden hour side light', level: 3 },
	// 4 · Advanced — multiple sources, color temperature contrast.
	{ key: 'keyrimcontrast', label: 'a warm key light and cool rim light in color contrast', level: 4 },
	{ key: 'practicalmix', label: 'mixed practical lights in warm and cool tones', level: 4 },
	{ key: 'neonmix', label: 'neon signage lighting with contrasting color casts', level: 4 },
	// 5 · Expert — full cinematic control, dramatic falloff.
	{ key: 'chiaroscuro', label: 'dramatic chiaroscuro lighting with deep shadow falloff', level: 5 },
	{ key: 'godrays', label: 'cinematic volumetric god rays piercing the shadows', level: 5 },
	{ key: 'multisource', label: 'complex multi-source cinematic lighting with rich falloff', level: 5 }
];

interface DetailOption {
	key: string;
	label: string;
	level: AxisLevel;
}

const DETAIL_OPTIONS: readonly DetailOption[] = [
	// 1 · Novice — visibly uncontrolled marks.
	{ key: 'roughedges', label: 'rough uneven edges and splotchy color fills', level: 1 },
	{ key: 'visiblemistakes', label: 'visible smudges and uneven coverage', level: 1 },
	{ key: 'crudelines', label: 'crude, wobbly outlines', level: 1 },
	// 2 · Beginner — clean but flat, no real texture yet.
	{ key: 'cleanlines', label: 'clean confident linework with flat solid color fills', level: 2 },
	{ key: 'tidyfill', label: 'tidy flat color fills with minimal texture', level: 2 },
	{ key: 'crisplines', label: 'crisp, uniform outlines', level: 2 },
	// 3 · Intermediate — basic shading and light surface texture.
	{ key: 'basicshading', label: 'basic cross-hatch shading and soft gradients', level: 3 },
	{ key: 'simpletexture', label: 'simple surface texture and gentle shading', level: 3 },
	{ key: 'softgradient', label: 'smooth, soft-edged shading gradients', level: 3 },
	// 4 · Advanced — real material texture, subtle imperfection.
	{ key: 'finetexture', label: 'fine surface texture like fabric weave and subtle imperfections', level: 4 },
	{ key: 'brushtexture', label: 'detailed material texture with visible brush or grain marks', level: 4 },
	{ key: 'layeredtexture', label: 'layered texture with subtle surface variation', level: 4 },
	// 5 · Expert — micro-detail, photographic fidelity.
	{ key: 'hyperdetail', label: 'hyper-detailed 8K micro-texture with individual pores and hairs', level: 5 },
	{ key: 'subsurface', label: 'photorealistic micro-detail including subsurface scattering', level: 5 },
	{ key: 'ultradetail', label: 'ultra-fine detail with razor-sharp micro-textures', level: 5 }
];

interface MoodOption {
	key: string;
	label: string;
}

const MOOD_OPTIONS: readonly MoodOption[] = [
	{ key: 'serene', label: 'a serene mood' },
	{ key: 'melancholic', label: 'a melancholic mood' },
	{ key: 'triumphant', label: 'a triumphant mood' },
	{ key: 'eerie', label: 'an eerie mood' },
	{ key: 'joyful', label: 'a joyful mood' },
	{ key: 'contemplative', label: 'a contemplative mood' },
	{ key: 'tense', label: 'a tense mood' },
	{ key: 'nostalgic', label: 'a nostalgic mood' },
	{ key: 'whimsical', label: 'a whimsical mood' },
	{ key: 'solemn', label: 'a solemn mood' }
];

interface TechOption {
	key: string;
	label: string;
}

const TECH_OPTIONS: readonly TechOption[] = [
	{ key: '85mm', label: '85mm portrait lens' },
	{ key: '35mm', label: '35mm wide angle' },
	{ key: 'macro100', label: 'macro 100mm' },
	{ key: 'f14', label: 'shallow depth of field f/1.4' },
	{ key: 'f11', label: 'deep focus f/11' },
	{ key: 'anamorphic', label: 'cinematic anamorphic lens' },
	{ key: 'raytrace', label: 'ray tracing' },
	{ key: 'octane', label: 'octane render' },
	{ key: 'grain35', label: '35mm film grain' },
	{ key: 'bokeh', label: 'creamy bokeh' },
	{ key: 'tiltshift', label: 'tilt-shift lens' },
	{ key: 'hdr', label: 'HDR photography' },
	{ key: 'unreal', label: 'Unreal Engine render' },
	{ key: 'mediumfmt', label: 'medium format look' }
];

export const EXPLORER_CATEGORY_LABELS: Record<ModifierCategory, string> = {
	'axis-style': 'Axis — Art style (crayon → oil)',
	'axis-subject': 'Axis — Subject complexity (object → action)',
	'axis-lighting': 'Axis — Lighting (flat → cinematic)',
	'axis-detail': 'Axis — Fine detail (splotchy → 8K)',
	'formula-mix': 'Formula — Full mix',
	'formula-tech': 'Formula — Full mix + technical cues'
};

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40);
}

function joinPrompt(...parts: string[]): string {
	return parts.filter(Boolean).join(', ');
}

function pickRoundRobin<T>(items: readonly T[], index: number): T {
	const i = ((index % items.length) + items.length) % items.length;
	return items[i] as T;
}

function byLevel<T extends { level: AxisLevel }>(items: readonly T[], level: AxisLevel): T[] {
	return items.filter((item) => item.level === level);
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

function styleFacet(option: StyleOption): AxisFacet {
	return { key: option.key, label: option.label, level: option.level };
}

function subjectFacet(option: SubjectOption): AxisFacet {
	return { key: option.key, label: option.label, level: option.level };
}

function lightingFacet(option: LightingOption): AxisFacet {
	return { key: option.key, label: option.label, level: option.level };
}

function detailFacet(option: DetailOption): AxisFacet {
	return { key: option.key, label: option.label, level: option.level };
}

function moodFacet(option: MoodOption): FlavorFacet {
	return { key: option.key, label: option.label };
}

function techFacet(option: TechOption): FlavorFacet {
	return { key: option.key, label: option.label };
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
	const base = [input.category, ...input.idParts.map(slugify)].filter(Boolean).join('-');
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

function buildPrompt(
	style: StyleOption,
	subject: SubjectOption,
	lighting: LightingOption,
	detail: DetailOption,
	mood: MoodOption,
	tech?: TechOption
): { prompt: string; facets: PromptFacets } {
	const prompt = tech
		? joinPrompt(style.label, subject.phrase, lighting.label, detail.label, mood.label, tech.label)
		: joinPrompt(style.label, subject.phrase, lighting.label, detail.label, mood.label);
	const facets: PromptFacets = {
		style: styleFacet(style),
		subject: subjectFacet(subject),
		lighting: lightingFacet(lighting),
		detail: detailFacet(detail),
		mood: moodFacet(mood),
		...(tech ? { tech: techFacet(tech) } : {})
	};
	return { prompt, facets };
}

/** Mid-complexity baseline subjects (level 3) used when the swept axis is style/lighting/detail. */
const BASELINE_SUBJECTS = byLevel(SUBJECT_OPTIONS, 3);

/**
 * Sweep one axis 1→5 while holding the other three at a fixed, round-robin baseline —
 * lets you line up "beginner through to expert" images for exactly one dimension.
 */
function buildAxisSweep(
	usedIds: Set<string>,
	category: ModifierCategory,
	axis: 'style' | 'lighting' | 'detail'
): ExplorerPromptCase[] {
	const options = axis === 'style' ? STYLE_OPTIONS : axis === 'lighting' ? LIGHTING_OPTIONS : DETAIL_OPTIONS;
	const cases: ExplorerPromptCase[] = [];
	let cursor = 0;

	for (const option of options) {
		// Repeat each option across a handful of baseline subjects for variety.
		for (let s = 0; s < 4; s += 1) {
			const subject = pickRoundRobin(BASELINE_SUBJECTS, cursor + s);
			const style = axis === 'style' ? (option as StyleOption) : pickRoundRobin(byLevel(STYLE_OPTIONS, 3), cursor + s);
			const lighting =
				axis === 'lighting' ? (option as LightingOption) : pickRoundRobin(byLevel(LIGHTING_OPTIONS, 3), cursor + s + 1);
			const detail =
				axis === 'detail' ? (option as DetailOption) : pickRoundRobin(byLevel(DETAIL_OPTIONS, 3), cursor + s + 2);
			const mood = pickRoundRobin(MOOD_OPTIONS, cursor + s);
			const { prompt, facets } = buildPrompt(style, subject, lighting, detail, mood);
			cases.push(
				makeCase(usedIds, {
					category,
					idParts: [option.key, subject.key, String(s)],
					modifier: `${AXIS_LEVEL_LABELS[option.level]} · ${option.label}`,
					subject: subject.phrase,
					prompt,
					facets
				})
			);
		}
		cursor += 4;
	}

	return cases;
}

/**
 * Subject axis sweeps the *subject itself* (object → action), so instead of a baseline
 * subject we hold style/lighting/detail at a mid (level 3) rotation and vary the subject.
 */
function buildSubjectSweep(usedIds: Set<string>): ExplorerPromptCase[] {
	const cases: ExplorerPromptCase[] = [];
	const midStyles = byLevel(STYLE_OPTIONS, 3);
	const midLighting = byLevel(LIGHTING_OPTIONS, 3);
	const midDetail = byLevel(DETAIL_OPTIONS, 3);

	SUBJECT_OPTIONS.forEach((subject, index) => {
		// Vary style/lighting/detail a little around the midpoint so the lane isn't monotonous,
		// while still keeping every image at roughly comparable (intermediate) polish.
		for (let variant = 0; variant < 3; variant += 1) {
			const style = pickRoundRobin(midStyles, index + variant);
			const lighting = pickRoundRobin(midLighting, index + variant + 1);
			const detail = pickRoundRobin(midDetail, index + variant + 2);
			const mood = pickRoundRobin(MOOD_OPTIONS, index + variant);
			const { prompt, facets } = buildPrompt(style, subject, lighting, detail, mood);
			cases.push(
				makeCase(usedIds, {
					category: 'axis-subject',
					idParts: [subject.key, String(variant)],
					modifier: `${AXIS_LEVEL_LABELS[subject.level]} · ${subject.label}`,
					subject: subject.phrase,
					prompt,
					facets
				})
			);
		}
	});

	return cases;
}

/**
 * Full combinatorial diversity: every axis varies together across its whole 1→5 range,
 * offset per-axis so dimensions don't lock-step. This is the "wide variety of combinations
 * and prompt arrangements" sweep, built from the same leveled vocabularies.
 */
function buildFormulaMix(usedIds: Set<string>, count: number, withTech: boolean): ExplorerPromptCase[] {
	const cases: ExplorerPromptCase[] = [];
	for (let i = 0; i < count; i += 1) {
		const style = pickRoundRobin(STYLE_OPTIONS, i);
		const subject = pickRoundRobin(SUBJECT_OPTIONS, i * 3 + 5);
		const lighting = pickRoundRobin(LIGHTING_OPTIONS, i * 2 + 7);
		const detail = pickRoundRobin(DETAIL_OPTIONS, i * 5 + 11);
		const mood = pickRoundRobin(MOOD_OPTIONS, i * 7 + 2);
		const tech = withTech ? pickRoundRobin(TECH_OPTIONS, i * 3 + 4) : undefined;
		const { prompt, facets } = buildPrompt(style, subject, lighting, detail, mood, tech);
		cases.push(
			makeCase(usedIds, {
				category: withTech ? 'formula-tech' : 'formula-mix',
				idParts: [
					String(i),
					style.key,
					subject.key,
					lighting.key,
					detail.key,
					...(tech ? [tech.key] : [])
				],
				modifier: `${style.label} · ${subject.label} · L${style.level}/${subject.level}/${lighting.level}/${detail.level}`,
				subject: subject.phrase,
				prompt,
				facets
			})
		);
	}
	return cases;
}

function buildAllCases(): ExplorerPromptCase[] {
	const usedIds = new Set<string>();
	return [
		...buildAxisSweep(usedIds, 'axis-style', 'style'),
		...buildSubjectSweep(usedIds),
		...buildAxisSweep(usedIds, 'axis-lighting', 'lighting'),
		...buildAxisSweep(usedIds, 'axis-detail', 'detail'),
		...buildFormulaMix(usedIds, 480, false),
		...buildFormulaMix(usedIds, 260, true)
	];
}

export const EXPLORER_PROMPT_CASES: readonly ExplorerPromptCase[] = buildAllCases();

export const EXPLORER_CASE_COUNT = EXPLORER_PROMPT_CASES.length;
