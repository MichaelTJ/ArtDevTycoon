import type { EngineErrorCode } from '$lib/types/contracts';

/** Every engine failure is one of these. The UI branches on `code`, shows `message`. */
export class EngineError extends Error {
	constructor(
		readonly code: EngineErrorCode,
		message: string,
		readonly cause?: unknown
	) {
		super(message);
		this.name = 'EngineError';
	}
}

/** Wrap an unknown thrown value. Never let a raw exception reach the UI. */
export function toEngineError(error: unknown, fallbackCode: EngineErrorCode): EngineError {
	if (error instanceof EngineError) {
		return error;
	}

	if (error instanceof DOMException && error.name === 'AbortError') {
		return new EngineError('cancelled', 'The operation was cancelled.', error);
	}

	const message =
		error instanceof Error && error.message.trim().length > 0
			? error.message
			: 'Something went wrong. Please try again.';

	return new EngineError(fallbackCode, message, error);
}
