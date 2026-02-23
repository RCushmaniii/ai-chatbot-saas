import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { getAuthUser } from "@/lib/auth";
import { membership, subscription } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function POST() {
	try {
		const user = await getAuthUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

		// Get subscription with Stripe customer ID
		const [existingSubscription] = await db
			.select()
			.from(subscription)
			.where(eq(subscription.businessId, userMembership.businessId))
			.limit(1);

		if (!existingSubscription?.stripeCustomerId) {
			return NextResponse.json(
				{ error: "No active subscription found" },
				{ status: 400 },
			);
		}

		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL || "https://botfoundry.online";

		// Create Stripe billing portal session
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: existingSubscription.stripeCustomerId,
			return_url: `${baseUrl}/admin`,
		});

		return NextResponse.json({ url: portalSession.url });
	} catch (error) {
		console.error("Error creating portal session:", error);
		return NextResponse.json(
			{ error: "Failed to create portal session" },
			{ status: 500 },
		);
	}
}
