/**
 * Retry-with-backoff for transient AI API failures.
 *
 * Wraps a single async call with bounded retries. Use this around any LLM
 * generation call to absorb 429s and 5xx hiccups without exposing them to
 * the user as a 500. The defaults match what the Anthropic + OpenAI docs
 * recommend: 3-4 attempts with exponential backoff in the few-hundred-ms
 * to few-second range.
 *
 * Network/transport errors (no `status`) are retried by default since
 * they're almost always transient on serverless. 4xx other than 429 are
 * NOT retried — those are usually a payload bug and won't get better.
 */

interface RetryOptions {
	attempts?: number;
	delaysMs?: readonly number[];
	label?: string;
	shouldRetry?: (err: unknown) => boolean;
}

const DEFAULT_DELAYS_MS = [200, 1000, 3000] as const;

function isTransientApiError(err: unknown): boolean {
	if (!err || typeof err !== "object") return true;
	const status =
		(err as { status?: unknown; statusCode?: unknown }).status ??
		(err as { status?: unknown; statusCode?: unknown }).statusCode;
	if (typeof status !== "number") return true;
	return status === 429 || (status >= 500 && status < 600);
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run `fn` with retries. Returns the successful result; rethrows the last
 * error if all attempts fail.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {},
): Promise<T> {
	const delays = options.delaysMs ?? DEFAULT_DELAYS_MS;
	const attempts = options.attempts ?? delays.length + 1;
	const shouldRetry = options.shouldRetry ?? isTransientApiError;
	const label = options.label ?? "ai-call";

	let lastError: unknown;

	for (let attempt = 0; attempt < attempts; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err;
			const isLast = attempt === attempts - 1;
			if (isLast || !shouldRetry(err)) {
				throw err;
			}
			const delay = delays[Math.min(attempt, delays.length - 1)];
			console.warn(
				`[${label}] attempt ${attempt + 1}/${attempts} failed, retrying in ${delay}ms`,
			);
			await sleep(delay);
		}
	}

	throw lastError;
}
