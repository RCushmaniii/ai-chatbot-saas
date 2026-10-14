/**
 * Server-Timing for the widget chat route, so speed is MEASURED per step
 * before anyone picks a fix (ny-ai-chatbot lesson 8: choose by measurement,
 * not assumption). The QA gate (scripts/qa-gate.ts) prints median and P95 of
 * every step; browsers show the same numbers in DevTools → Network → Timing.
 *
 * Durations only — never values. The header is public.
 */
export function createTimer() {
	const steps: Array<[string, number]> = [];
	const started = performance.now();

	return {
		/** Time an async step and record it under `name`. */
		async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
			const t0 = performance.now();
			try {
				return await fn();
			} finally {
				steps.push([name, performance.now() - t0]);
			}
		},
		/** Record a duration measured elsewhere (e.g. inside knowledge search). */
		add(name: string, ms: number) {
			steps.push([name, ms]);
		},
		/** Everything since the request started, recorded as `name`. */
		mark(name: string) {
			steps.push([name, performance.now() - started]);
		},
		header(): string {
			return steps
				.map(([name, ms]) => `${name};dur=${ms.toFixed(1)}`)
				.join(", ");
		},
	};
}

export type Timer = ReturnType<typeof createTimer>;
