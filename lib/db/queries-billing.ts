import "server-only";

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	entitlementsByPlan,
	type PlanEntitlements,
} from "@/lib/ai/entitlements";
import { plan, subscription, usageRecord } from "./schema";

const client = postgres(process.env.POSTGRES_URL!);
const rawClient = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Get the current plan entitlements for a business based on their active subscription.
 * Falls back to free tier if no subscription exists.
 */
export async function getBusinessPlanEntitlements({
	businessId,
}: {
	businessId: string;
}): Promise<{ entitlements: PlanEntitlements; planName: string }> {
	const [sub] = await db
		.select({ planId: subscription.planId, status: subscription.status })
		.from(subscription)
		.where(eq(subscription.businessId, businessId))
		.limit(1);

	if (!sub || sub.status === "canceled" || sub.status === "incomplete") {
		return { entitlements: entitlementsByPlan.free, planName: "free" };
	}

	const [businessPlan] = await db
		.select({ name: plan.name })
		.from(plan)
		.where(eq(plan.id, sub.planId))
		.limit(1);

	const planName = businessPlan?.name || "free";
	const entitlements = entitlementsByPlan[planName] || entitlementsByPlan.free;

	return { entitlements, planName };
}

/**
 * Increment the message count for a business in the current month.
 * Creates the usage record if it doesn't exist (upsert via raw SQL
 * using the unique index on (business_id, month)).
 */
export async function incrementMessageCount({
	businessId,
}: {
	businessId: string;
}): Promise<void> {
	const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

	await rawClient`
		INSERT INTO "UsageRecord" (id, business_id, month, messages_count, tokens_used, knowledge_base_pages_count, created_at, updated_at)
		VALUES (gen_random_uuid(), ${businessId}, ${currentMonth}, 1, 0, 0, now(), now())
		ON CONFLICT (business_id, month)
		DO UPDATE SET messages_count = "UsageRecord".messages_count + 1, updated_at = now()
	`;
}

/**
 * Get the current month's message count for a business.
 */
export async function getMonthlyMessageCount({
	businessId,
}: {
	businessId: string;
}): Promise<number> {
	const currentMonth = new Date().toISOString().slice(0, 7);

	const [record] = await db
		.select({ messagesCount: usageRecord.messagesCount })
		.from(usageRecord)
		.where(
			and(
				eq(usageRecord.businessId, businessId),
				eq(usageRecord.month, currentMonth),
			),
		)
		.limit(1);

	return record?.messagesCount || 0;
}

/**
 * Check if a business has exceeded their monthly message limit.
 * Returns { allowed: true } if under limit, or { allowed: false, limit, used } if over.
 */
export async function checkMessageLimit({
	businessId,
}: {
	businessId: string;
}): Promise<
	{ allowed: true } | { allowed: false; limit: number; used: number }
> {
	const [{ entitlements }, messageCount] = await Promise.all([
		getBusinessPlanEntitlements({ businessId }),
		getMonthlyMessageCount({ businessId }),
	]);

	if (messageCount >= entitlements.messagesPerMonth) {
		return {
			allowed: false,
			limit: entitlements.messagesPerMonth,
			used: messageCount,
		};
	}

	return { allowed: true };
}
