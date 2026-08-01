/**
 * Runtime-validate gallery image URLs before handing them to Phaser's loader.
 * Restored saves and mock SVGs use data URLs; relative `/` paths are fine for
 * static assets. Reject anything that could be a script or opaque scheme.
 */
export function isSafeStudioImageUrl(url: string): boolean {
	if (typeof url !== 'string') return false;
	const trimmed = url.trim();
	if (trimmed.length === 0 || trimmed.length > 2_000_000) return false;

	if (trimmed.startsWith('data:image/')) {
		const comma = trimmed.indexOf(',');
		if (comma < 0) return false;
		const header = trimmed.slice(0, comma).toLowerCase();
		return (
			header.includes('image/png') ||
			header.includes('image/jpeg') ||
			header.includes('image/jpg') ||
			header.includes('image/gif') ||
			header.includes('image/webp') ||
			header.includes('image/svg+xml')
		);
	}

	if (trimmed.startsWith('blob:')) {
		return trimmed.length > 5;
	}

	if (trimmed.startsWith('/')) {
		return !trimmed.startsWith('//');
	}

	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === 'https:' || parsed.protocol === 'http:';
	} catch {
		return false;
	}
}
