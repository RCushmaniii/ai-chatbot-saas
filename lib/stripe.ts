import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
	if (!_stripe) {
		if (!process.env.STRIPE_SECRET_KEY) {
			throw new Error("STRIPE_SECRET_KEY is not set");
		}
		_stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
			apiVersion: "2026-01-28.clover",
			typescript: true,
		});
	}
	return _stripe;
}

/** @deprecated Use getStripe() instead — kept for backward compatibility */
export const stripe = new Proxy({} as Stripe, {
	get(_target, prop) {
		return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
	},
});

export const STRIPE_WEBHOOK_SECRET_SNAPSHOT =
	process.env.STRIPE_WEBHOOK_SECRET_SNAPSHOT;
