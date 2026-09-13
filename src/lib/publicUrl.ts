/**
 * Prefix a site-root static path with Vite/SvelteKit `BASE_URL`.
 * Local `/` stays `/studio/…`. GitHub Pages relative base becomes `./studio/…`.
 * Data URLs, blobs, and non-root paths are left unchanged.
 */
export function publicUrl(path: string): string {
	if (typeof path !== 'string' || path.length === 0) return path;
	if (path.startsWith('data:') || path.startsWith('blob:')) return path;
	if (!path.startsWith('/') || path.startsWith('//')) return path;
	const rawBase = import.meta.env.BASE_URL ?? '/';
	if (rawBase === './' || rawBase === '.') return `.${path}`;
	const base = rawBase.replace(/\/$/, '');
	return `${base}${path}`;
}
