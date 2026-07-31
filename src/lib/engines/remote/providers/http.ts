/** Convert a Blob to raw base64 (no data-URL prefix). */
export async function blobToRawBase64(blob: Blob): Promise<string> {
	const buffer = await blob.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]!);
	}
	return btoa(binary);
}

/** Convert a Blob to a `data:` URL for OpenAI-style vision parts. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
	const b64 = await blobToRawBase64(blob);
	const mime = blob.type && blob.type.length > 0 ? blob.type : 'image/png';
	return `data:${mime};base64,${b64}`;
}

export function reachabilityReason(baseUrl: string, hint: string): string {
	return `Could not reach ${baseUrl}. ${hint}`;
}

export function errorMessageFromBody(data: unknown, status: number): string {
	if (data && typeof data === 'object' && 'error' in data) {
		const err = (data as { error: unknown }).error;
		if (typeof err === 'string' && err.trim().length > 0) {
			return err;
		}
		if (err && typeof err === 'object' && 'message' in err) {
			const msg = (err as { message: unknown }).message;
			if (typeof msg === 'string' && msg.trim().length > 0) {
				return msg;
			}
		}
	}
	return `Request failed (${status})`;
}

export async function parseJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return {};
	}
}
