import { auth, currentUser } from "@clerk/nextjs/server";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!);

export type AuthUser = {
	id: string;
	clerkUserId: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
	locale: string;
	businessId: string;
	botId: string;
};

/**
 * Get the current authenticated user with their business context
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<AuthUser | null> {
	const { userId } = await auth();

	if (!userId) {
		return null;
	}

	// Get user from our database
	const [dbUser] = await sql`
    SELECT
      u.id,
      u.clerk_user_id as "clerkUserId",
      u.email,
      u.name,
      u.avatar_url as "avatarUrl",
      u.locale,
      m."businessId",
      b.id as "botId"
    FROM "User" u
    LEFT JOIN "Membership" m ON m."userId" = u.id
    LEFT JOIN "Bot" b ON b."businessId" = m."businessId"
    WHERE u.clerk_user_id = ${userId}
    LIMIT 1
  `;

	if (!dbUser) {
		// User exists in Clerk but not in our database yet
		// This can happen if webhook hasn't processed yet
		// Create user on-demand
		const clerkUser = await currentUser();
		if (!clerkUser) return null;

		const email = clerkUser.emailAddresses?.[0]?.emailAddress;
		if (!email) return null;

		const name =
			[clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
			null;

		// Create user
		const [newUser] = await sql`
      INSERT INTO "User" (email, clerk_user_id, name, avatar_url, locale)
      VALUES (${email}, ${userId}, ${name}, ${clerkUser.imageUrl}, 'es')
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url
      RETURNING id
    `;

		// Create default business
		const [business] = await sql`
      INSERT INTO "Business" (name, "createdAt")
      VALUES (${name ? `${name}'s Business` : "Mi Negocio"}, NOW())
      RETURNING id
    `;

		await sql`
      INSERT INTO "Membership" ("businessId", "userId", role)
      VALUES (${business.id}, ${newUser.id}, 'owner')
    `;

		// Create default bot
		const [bot] = await sql`
      INSERT INTO "Bot" ("businessId", name, "createdAt")
      VALUES (${business.id}, 'Mi Chatbot', NOW())
      RETURNING id
    `;

		// Create subscription on free plan
		const [freePlan] = await sql`
      SELECT id FROM "Plan" WHERE is_default = true LIMIT 1
    `;

		if (freePlan) {
			await sql`
        INSERT INTO "Subscription" (business_id, plan_id, status)
        VALUES (${business.id}, ${freePlan.id}, 'active')
      `;
		}

		return {
			id: newUser.id,
			clerkUserId: userId,
			email,
			name,
			avatarUrl: clerkUser.imageUrl,
			locale: "es",
			businessId: business.id,
			botId: bot.id,
		};
	}

	return dbUser as AuthUser;
}

/**
 * Require authentication - throws redirect if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
	const user = await getAuthUser();

	if (!user) {
		throw new Error("Unauthorized");
	}

	return user;
}

/**
 * Get the current user's business subscription
 */
export async function getUserSubscription(businessId: string) {
	const [subscription] = await sql`
    SELECT
      s.*,
      p.name as "planName",
      p.display_name as "planDisplayName",
      p.messages_per_month as "messagesPerMonth",
      p.knowledge_base_pages_limit as "knowledgeBasePagesLimit",
      p.chatbots_limit as "chatbotsLimit",
      p.team_members_limit as "teamMembersLimit",
      p.features
    FROM "Subscription" s
    JOIN "Plan" p ON p.id = s.plan_id
    WHERE s.business_id = ${businessId}
    LIMIT 1
  `;

	return subscription || null;
}

/**
 * Get current month's usage for a business
 */
export async function getBusinessUsage(businessId: string) {
	const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

	const [usage] = await sql`
    SELECT * FROM "UsageRecord"
    WHERE business_id = ${businessId} AND month = ${currentMonth}
  `;

	return (
		usage || {
			messagesCount: 0,
			tokensUsed: 0,
			knowledgeBasePagesCount: 0,
		}
	);
}
