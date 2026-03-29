import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import postgres from "postgres";
import type Stripe from "stripe";
import { plan, subscription } from "@/lib/db/schema";
import { STRIPE_WEBHOOK_SECRET_SNAPSHOT, stripe } from "@/lib/stripe";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// In-memory set to deduplicate webhook events within the same instance.
// Stripe retries deliver the same event.id — rejecting duplicates prevents
// double-writes when the webhook fires twice before the DB reflects the first write.
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 1000;

function markEventProcessed(eventId: string) {
	if (processedEvents.size >= MAX_PROCESSED_EVENTS) {
		// Evict oldest entries (Set iterates in insertion order)
		const iterator = processedEvents.values();
		for (let i = 0; i < 200; i++) {
			const next = iterator.next();
			if (next.done) break;
			processedEvents.delete(next.value);
		}
	}
	processedEvents.add(eventId);
}

export async function POST(request: Request) {
	const body = await request.text();
	const headersList = await headers();
	const signature = headersList.get("stripe-signature");

	if (!signature || !STRIPE_WEBHOOK_SECRET_SNAPSHOT) {
		console.error("Missing stripe signature or webhook secret");
		return NextResponse.json(
			{ error: "Missing stripe signature or webhook secret" },
			{ status: 400 },
		);
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(
			body,
			signature,
			STRIPE_WEBHOOK_SECRET_SNAPSHOT,
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error(`Webhook signature verification failed: ${message}`);
		return NextResponse.json(
			{ error: `Webhook Error: ${message}` },
			{ status: 400 },
		);
	}

	// Idempotency: skip already-processed events
	if (processedEvents.has(event.id)) {
		return NextResponse.json({ received: true, deduplicated: true });
	}

	try {
		switch (event.type) {
			case "checkout.session.completed":
				await handleCheckoutSessionCompleted(
					event.data.object as Stripe.Checkout.Session,
				);
				break;

			case "customer.subscription.created":
			case "customer.subscription.updated":
				await handleSubscriptionChange(
					event.data.object as Stripe.Subscription,
				);
				break;

			case "customer.subscription.deleted":
				await handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
				);
				break;

			case "invoice.paid":
				await handleInvoicePaid(event.data.object as Stripe.Invoice);
				break;

			case "invoice.payment_failed":
				await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
				break;

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		markEventProcessed(event.id);
		return NextResponse.json({ received: true });
	} catch (error) {
		console.error(`Webhook processing failed [${event.type}]:`, error);
		// Return 500 so Stripe retries the webhook
		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
	}
}

async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
) {
	const customerId = session.customer as string;
	const subscriptionId = session.subscription as string;
	const businessId = session.metadata?.businessId;
	const planId = session.metadata?.planId;

	if (!businessId) {
		console.error("No businessId in checkout session metadata");
		return;
	}

	// Idempotency: check if this subscription is already recorded
	if (subscriptionId) {
		const [existing] = await db
			.select({ id: subscription.id })
			.from(subscription)
			.where(eq(subscription.stripeSubscriptionId, subscriptionId))
			.limit(1);

		if (existing) {
			console.log(
				`Checkout already processed for subscription ${subscriptionId}`,
			);
			return;
		}
	}

	// Update the subscription record with Stripe IDs
	const updateData: Record<string, unknown> = {
		stripeCustomerId: customerId,
		stripeSubscriptionId: subscriptionId,
		status: "active",
		updatedAt: new Date(),
	};

	// If we have a planId from metadata, update it too
	if (planId) {
		updateData.planId = planId;
	}

	await db
		.update(subscription)
		.set(updateData)
		.where(eq(subscription.businessId, businessId));

	console.log(`Checkout completed for business ${businessId}`);
}

async function handleSubscriptionChange(
	stripeSubscription: Stripe.Subscription,
) {
	const customerId = stripeSubscription.customer as string;
	const subscriptionItem = stripeSubscription.items.data[0];
	const priceId = subscriptionItem?.price.id;

	// Find the subscription by Stripe customer ID or subscription ID
	const [existingSubscription] = await db
		.select()
		.from(subscription)
		.where(eq(subscription.stripeCustomerId, customerId))
		.limit(1);

	if (!existingSubscription) {
		// Could be a new subscription created outside our checkout flow
		console.error(`No subscription found for customer ${customerId}`);
		return;
	}

	// Find the plan by price ID (check monthly first, then annual)
	const [matchingMonthlyPlan] = await db
		.select()
		.from(plan)
		.where(eq(plan.stripePriceIdMonthly, priceId))
		.limit(1);

	const [matchingAnnualPlan] = matchingMonthlyPlan
		? [null]
		: await db
				.select()
				.from(plan)
				.where(eq(plan.stripePriceIdAnnual, priceId))
				.limit(1);

	const finalPlan = matchingMonthlyPlan || matchingAnnualPlan;

	// Map Stripe status to our status enum
	const statusMap: Record<
		string,
		"trialing" | "active" | "canceled" | "past_due" | "incomplete"
	> = {
		trialing: "trialing",
		active: "active",
		canceled: "canceled",
		past_due: "past_due",
		incomplete: "incomplete",
		incomplete_expired: "canceled",
		unpaid: "past_due",
		paused: "canceled",
	};

	const status = statusMap[stripeSubscription.status] || "incomplete";
	const billingCycle =
		priceId === finalPlan?.stripePriceIdAnnual ? "annual" : "monthly";

	// Get period dates from subscription item
	const periodStart = subscriptionItem?.current_period_start;
	const periodEnd = subscriptionItem?.current_period_end;

	await db
		.update(subscription)
		.set({
			status,
			billingCycle,
			stripeSubscriptionId: stripeSubscription.id,
			planId: finalPlan?.id || existingSubscription.planId,
			currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
			currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
			canceledAt: stripeSubscription.canceled_at
				? new Date(stripeSubscription.canceled_at * 1000)
				: null,
			updatedAt: new Date(),
		})
		.where(eq(subscription.id, existingSubscription.id));

	console.log(`Subscription updated for customer ${customerId}: ${status}`);
}

async function handleSubscriptionDeleted(
	stripeSubscription: Stripe.Subscription,
) {
	const customerId = stripeSubscription.customer as string;

	await db
		.update(subscription)
		.set({
			status: "canceled",
			canceledAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(subscription.stripeCustomerId, customerId));

	console.log(`Subscription canceled for customer ${customerId}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
	const customerId = invoice.customer as string;

	// Only update if subscription is past_due (recovering from failed payment)
	await db
		.update(subscription)
		.set({
			status: "active",
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(subscription.stripeCustomerId, customerId),
				eq(subscription.status, "past_due"),
			),
		);

	console.log(`Invoice paid for customer ${customerId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
	const customerId = invoice.customer as string;

	await db
		.update(subscription)
		.set({
			status: "past_due",
			updatedAt: new Date(),
		})
		.where(eq(subscription.stripeCustomerId, customerId));

	console.log(`Invoice payment failed for customer ${customerId}`);
}
