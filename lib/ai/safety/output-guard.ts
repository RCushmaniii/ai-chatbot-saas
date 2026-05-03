/**
 * Output sentinel detection.
 *
 * After the LLM responds, we scan the response for structural markers from
 * the system prompt or scaffolding that should never reach a user. If a
 * leak is detected, callers swap the response for a safe fallback and log
 * the original to Sentry for review.
 *
 * The defense pairs with input-guard.ts: input filtering catches the
 * baseline; output filtering catches what slips past.
 */

/**
 * Sentinels are case-sensitive markers that appear in our system prompt
 * scaffolding or RAG-injection blocks. Real user-facing answers should
 * never contain these — if they do, the model is echoing structure.
 */
const SENTINELS: readonly string[] = [
	// RAG block headers we inject around knowledge results
	"=== KNOWLEDGE BASE RESULTS ===",
	"Knowledge base results:",
	"Include these links at the end of your response:",

	// System prompt structural headers (NY English Teacher prompt)
	"ABOUT MY SERVICE:",
	"TARGET CLIENTS:",
	"MY COACHING APPROACH:",
	"OBJECTION HANDLING:",
	"CORE FACTS YOU ALWAYS KNOW:",

	// Tool/artifact prompt scaffolding
	"createDocument`",
	"updateDocument`",
	"`createDocument`",
	"`updateDocument`",
];

/**
 * Patterns that indicate the model is acknowledging instructions instead of
 * answering the user. These are model-agnostic LLM tells.
 */
const META_PATTERNS: readonly RegExp[] = [
	/\bAs an AI (language\s+)?model\b/i,
	/\bI cannot (reveal|share|disclose|display) (my|the) (system\s+)?(prompt|instructions?)\b/i,
	/\bMy (system\s+)?(prompt|instructions?) (says?|states?|tells?)\b/i,
	/\bI was (told|instructed|programmed) to\b/i,
	/\bThe instructions (say|state|tell|require)\b/i,
];

const MIN_RESPONSE_CHARS = 1;
const MAX_RESPONSE_CHARS = 8000;

export interface OutputGuardResult {
	ok: boolean;
	reason?: "sentinel" | "meta" | "empty" | "too_long";
	matched?: string;
}

/**
 * Check an LLM response for leakage / scaffolding artifacts.
 * Returns { ok: true } if the response is safe to surface to the user.
 */
export function checkOutput(output: string): OutputGuardResult {
	if (typeof output !== "string" || output.length < MIN_RESPONSE_CHARS) {
		return { ok: false, reason: "empty" };
	}

	if (output.length > MAX_RESPONSE_CHARS) {
		return { ok: false, reason: "too_long" };
	}

	for (const sentinel of SENTINELS) {
		if (output.includes(sentinel)) {
			return { ok: false, reason: "sentinel", matched: sentinel };
		}
	}

	for (const pattern of META_PATTERNS) {
		const match = output.match(pattern);
		if (match) {
			return {
				ok: false,
				reason: "meta",
				matched: match[0]?.slice(0, 60),
			};
		}
	}

	return { ok: true };
}

/**
 * Safe bilingual fallback used when the response fails checkOutput.
 * Generic on purpose — leaking ANY business-specific copy here would
 * defeat the purpose.
 */
export const SAFE_OUTPUT_FALLBACK = {
	en: "I'm not able to answer that right now. Could you rephrase your question or ask about our services?",
	es: "No puedo responder eso en este momento. ¿Puedes reformular tu pregunta o preguntar sobre nuestros servicios?",
} as const;
