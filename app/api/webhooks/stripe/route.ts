import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import postgres from "postgres";
import type Stripe from "stripe";
import { plan, subscription } from "@/lib/db/schema";
import { STRIPE_WEBHOOK_SECRET_SNAPSHOT, stripe } from "@/lib/stripe";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

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

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Error processing webhook:", error);
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

	if (!businessId) {
		console.error("No businessId in checkout session metadata");
		return;
	}

	// Update the subscription record with Stripe IDs
	await db
		.update(subscription)
		.set({
			stripeCustomerId: customerId,
			stripeSubscriptionId: subscriptionId,
			status: "active",
			updatedAt: new Date(),
		})
		.where(eq(subscription.businessId, businessId));

	console.log(`Checkout completed for business ${businessId}`);
}

async function handleSubscriptionChange(
	stripeSubscription: Stripe.Subscription,
) {
	const customerId = stripeSubscription.customer as string;
	const subscriptionItem = stripeSubscription.items.data[0];
	const priceId = subscriptionItem?.price.id;

	// Find the subscription by Stripe customer ID
	const [existingSubscription] = await db
		.select()
		.from(subscription)
		.where(eq(subscription.stripeCustomerId, customerId))
		.limit(1);

	if (!existingSubscription) {
		console.error(`No subscription found for customer ${customerId}`);
		return;
	}

	// Find the plan by price ID
	const [matchingPlan] = await db
		.select()
		.from(plan)
		.where(eq(plan.stripePriceIdMonthly, priceId))
		.limit(1);

	const [matchingAnnualPlan] = matchingPlan
		? [matchingPlan]
		: await db
				.select()
				.from(plan)
				.where(eq(plan.stripePriceIdAnnual, priceId))
				.limit(1);

	const finalPlan = matchingPlan || matchingAnnualPlan;

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

	// Update subscription status to active if it was past_due
	await db
		.update(subscription)
		.set({
			status: "active",
			updatedAt: new Date(),
		})
		.where(eq(subscription.stripeCustomerId, customerId));

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
