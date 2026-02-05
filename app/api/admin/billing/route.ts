import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	plan,
	subscription,
	membership,
	usageRecord,
	contentSource,
} from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET() {
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
			return NextResponse.json({
				plan: null,
				subscription: null,
				usage: { messagesUsed: 0, pagesUsed: 0 },
			});
		}

		// Get subscription
		const [userSubscription] = await db
			.select()
			.from(subscription)
			.where(eq(subscription.businessId, userMembership.businessId))
			.limit(1);

		// Get plan details
		let userPlan = null;
		if (userSubscription?.planId) {
			const [foundPlan] = await db
				.select()
				.from(plan)
				.where(eq(plan.id, userSubscription.planId))
				.limit(1);
			userPlan = foundPlan;
		}

		// If no plan, get the default free plan
		if (!userPlan) {
			const [freePlan] = await db
				.select()
				.from(plan)
				.where(eq(plan.isDefault, true))
				.limit(1);
			userPlan = freePlan;
		}

		// Get current month usage
		const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
		const [usage] = await db
			.select()
			.from(usageRecord)
			.where(
				and(
					eq(usageRecord.businessId, userMembership.businessId),
					eq(usageRecord.month, currentMonth)
				)
			)
			.limit(1);

		// Get knowledge base pages count
		const [pagesCount] = await db
			.select({ count: sql<number>`count(*)` })
			.from(contentSource)
			.where(eq(contentSource.businessId, userMembership.businessId));

		return NextResponse.json({
			plan: userPlan
				? {
						name: userPlan.name,
						displayName: userPlan.displayName,
						messagesPerMonth: userPlan.messagesPerMonth,
						knowledgeBasePagesLimit: userPlan.knowledgeBasePagesLimit,
					}
				: null,
			subscription: userSubscription
				? {
						status: userSubscription.status,
						billingCycle: userSubscription.billingCycle,
						currentPeriodEnd: userSubscription.currentPeriodEnd?.toISOString(),
						stripeCustomerId: userSubscription.stripeCustomerId,
					}
				: null,
			usage: {
				messagesUsed: usage?.messagesCount || 0,
				pagesUsed: Number(pagesCount?.count) || 0,
			},
		});
	} catch (error) {
		console.error("Error fetching billing:", error);
		return NextResponse.json(
			{ error: "Failed to fetch billing info" },
			{ status: 500 }
		);
	}
}
