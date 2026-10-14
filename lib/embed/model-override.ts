/**
 * `pnpm qa-gate --model <id>` — answer with another model, to compare models
 * by measured speed and gate results rather than by assumption.
 *
 * Honoured ONLY outside production (the local dev server). On production the
 * header is ignored and the routed model answers, so nobody can pick a pricier
 * model on a tenant's bill. The route reports the model that actually wrote
 * each answer in `X-Chat-Model`, and the gate stops if it is not the one asked
 * for, rather than judging the wrong model.
 *
 * Only ids on this list are accepted, so a typo fails loudly instead of
 * reaching the provider.
 */
export const OVERRIDABLE_MODELS = [
	"gpt-4o-mini",
	"gpt-4o",
	"gpt-4.1-mini",
	"gpt-4.1",
	"gpt-4.1-nano",
] as const;

export type OverridableModel = (typeof OVERRIDABLE_MODELS)[number];

export function resolveModelOverride(
	request: Request,
	env: Record<string, string | undefined> = process.env as Record<
		string,
		string | undefined
	>,
): OverridableModel | null {
	if (env.VERCEL_ENV === "production") return null;
	const asked = request.headers.get("x-chat-model")?.trim();
	return (OVERRIDABLE_MODELS as readonly string[]).includes(asked ?? "")
		? (asked as OverridableModel)
		: null;
}
