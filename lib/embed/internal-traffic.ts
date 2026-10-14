import { timingSafeEqual } from "node:crypto";

/**
 * Is this widget request the QA gate (scripts/qa-gate.ts), not a visitor?
 *
 * Gate traffic is stored as internal: the conversation is tagged
 * `metadata.internal = true` and the message is NOT counted toward the
 * tenant's monthly usage, so gate runs never look like visitors and never
 * spend a customer's quota.
 *
 * Unlike ny-ai-chatbot, the `x-test-run: qa-gate` header alone is NOT enough
 * here. This product bills by message count, so a header anyone can type would
 * be a free unlimited plan. It must arrive with `x-qa-token` equal to the
 * QA_GATE_TOKEN env var; without a match the request is an ordinary visitor —
 * counted, rate limited and logged like any other.
 */
export function isQaGateRequest(
	request: Request,
	env: Record<string, string | undefined> = process.env as Record<
		string,
		string | undefined
	>,
): boolean {
	if (request.headers.get("x-test-run") !== "qa-gate") return false;
	const expected = env.QA_GATE_TOKEN?.trim();
	const given = request.headers.get("x-qa-token")?.trim();
	if (!expected || !given) return false;
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}
