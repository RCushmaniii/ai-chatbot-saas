import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { getAuthUser } from "@/lib/auth";
import { membership, plan, subscription } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function POST(request: Request) {
	try {
		const user = await getAuthUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { planId, billingCycle = "monthly" } = body;

		if (!planId) {
			return NextResponse.json(
				{ error: "Plan ID is required" },
				{ status: 400 },
			);
		}

		// Get the plan
		const [selectedPlan] = await db
			.select()
			.from(plan)
			.where(eq(plan.id, planId))
			.limit(1);

		if (!selectedPlan) {
			return NextResponse.json({ error: "Plan not found" }, { status: 404 });
		}

		// Get the price ID based on billing cycle
		const priceId =
			billingCycle === "annual"
				? selectedPlan.stripePriceIdAnnual
				: selectedPlan.stripePriceIdMonthly;

		if (!priceId) {
			return NextResponse.json(
				{ error: "Stripe price not configured for this plan" },
				{ status: 400 },
			);
		}

		// Get user's business
		const [userMembership] = await db
			.select()
			.from(membership)
			.where(eq(membership.userId, user.id))
			.limit(1);

		if (!userMembership) {
			return NextResponse.json(
				{ error: "No business found for user" },
				{ status: 400 },
			);
		}

		// Check if user already has a subscription with a Stripe customer
		const [existingSubscription] = await db
			.select()
			.from(subscription)
			.where(eq(subscription.businessId, userMembership.businessId))
			.limit(1);

		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL || "https://botfoundry.online";

		// Create Stripe checkout session
		const checkoutSession = await stripe.checkout.sessions.create({
			mode: "subscription",
			payment_method_types: ["card"],
			customer: existingSubscription?.stripeCustomerId || undefined,
			customer_email: existingSubscription?.stripeCustomerId
				? undefined
				: user.email,
			line_items: [
				{
					price: priceId,
					quantity: 1,
				},
			],
			metadata: {
				businessId: userMembership.businessId,
				planId: selectedPlan.id,
				userId: user.id,
			},
			success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${baseUrl}/checkout/cancel`,
			subscription_data: {
				metadata: {
					businessId: userMembership.businessId,
					planId: selectedPlan.id,
				},
			},
		});

		return NextResponse.json({ url: checkoutSession.url });
	} catch (error) {
		console.error("Error creating checkout session:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 },
		);
	}
}
