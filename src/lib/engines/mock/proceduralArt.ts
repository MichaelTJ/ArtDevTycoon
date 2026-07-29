import { mulberry32 } from '../random';

/** Deterministic 512x512 SVG. The same seed always yields byte-identical output. */
export function paintProceduralArt(seed: number): string {
	const rng = mulberry32(seed);

	const bgHue = Math.floor(rng() * 360);
	const circles: string[] = [];
	for (let i = 0; i < 5; i++) {
		const cx = 64 + Math.floor(rng() * (448 - 64));
		const cy = 64 + Math.floor(rng() * (448 - 64));
		const r = 40 + Math.floor(rng() * (120 - 40));
		const hue = (bgHue + i * 47) % 360;
		circles.push(
			`<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${hue}, 65%, 65%)" fill-opacity="0.75" stroke="hsl(0 0% 25%)" stroke-width="3"/>`
		);
	}

	const paths: string[] = [];
	for (let i = 0; i < 3; i++) {
		const x1 = Math.floor(rng() * 512);
		const y1 = Math.floor(rng() * 512);
		const cx1 = Math.floor(rng() * 512);
		const cy1 = Math.floor(rng() * 512);
		const cx2 = Math.floor(rng() * 512);
		const cy2 = Math.floor(rng() * 512);
		const x2 = Math.floor(rng() * 512);
		const y2 = Math.floor(rng() * 512);
		const strokeWidth = 2 + Math.floor(rng() * (6 - 2));
		const hue = Math.floor(rng() * 360);
		paths.push(
			`<path d="M ${x1} ${y1} Q ${cx1} ${cy1} ${cx2} ${cy2} Q ${cx1} ${cy1} ${x2} ${y2}" fill="none" stroke="hsl(${hue}, 70%, 45%)" stroke-width="${strokeWidth}" stroke-opacity="0.5"/>`
		);
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<filter id="grain">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
</filter>
</defs>
<rect width="512" height="512" fill="hsl(${bgHue}, 55%, 90%)"/>
${circles.join('\n')}
${paths.join('\n')}
<rect width="512" height="512" filter="url(#grain)" opacity="0.12"/>
</svg>`;
}
