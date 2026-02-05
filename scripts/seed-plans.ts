import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { plan } from "../lib/db/schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

const plans = [
	{
		name: "free",
		displayName: "Free",
		description: "Perfect for trying out BotFoundry",
		priceMonthly: 0,
		priceAnnual: 0,
		stripePriceIdMonthly: null,
		stripePriceIdAnnual: null,
		messagesPerMonth: 100,
		knowledgeBasePagesLimit: 10,
		chatbotsLimit: 1,
		teamMembersLimit: 1,
		features: ["Basic analytics", "Email support"],
		isActive: true,
		isDefault: true,
		sortOrder: 0,
	},
	{
		name: "starter",
		displayName: "Starter",
		description: "For small businesses getting started",
		priceMonthly: 2900, // $29/month
		priceAnnual: 27840, // $232/year (20% off)
		stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || null,
		stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || null,
		messagesPerMonth: 1000,
		knowledgeBasePagesLimit: 100,
		chatbotsLimit: 2,
		teamMembersLimit: 2,
		features: [
			"Advanced analytics",
			"Custom branding",
			"Priority email support",
		],
		isActive: true,
		isDefault: false,
		sortOrder: 1,
	},
	{
		name: "pro",
		displayName: "Pro",
		description: "For growing teams that need more",
		priceMonthly: 7900, // $79/month
		priceAnnual: 75840, // $632/year (20% off)
		stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
		stripePriceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL || null,
		messagesPerMonth: 5000,
		knowledgeBasePagesLimit: 500,
		chatbotsLimit: 5,
		teamMembersLimit: 5,
		features: [
			"Advanced analytics",
			"Custom branding",
			"Priority support",
			"Playbooks & automation",
			"Live chat handoff",
			"API access",
		],
		isActive: true,
		isDefault: false,
		sortOrder: 2,
	},
	{
		name: "business",
		displayName: "Business",
		description: "For larger organizations",
		priceMonthly: 19900, // $199/month
		priceAnnual: 191040, // $1592/year (20% off)
		stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || null,
		stripePriceIdAnnual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || null,
		messagesPerMonth: 25000,
		knowledgeBasePagesLimit: 2000,
		chatbotsLimit: -1, // unlimited
		teamMembersLimit: -1, // unlimited
		features: [
			"Everything in Pro",
			"Unlimited chatbots",
			"Unlimited team members",
			"Dedicated support",
			"Custom integrations",
			"SLA guarantee",
		],
		isActive: true,
		isDefault: false,
		sortOrder: 3,
	},
];

async function seed() {
	console.log("Seeding plans...");

	for (const planData of plans) {
		try {
			await db
				.insert(plan)
				.values({
					...planData,
					createdAt: new Date(),
				})
				.onConflictDoNothing();
			console.log(`  Created plan: ${planData.displayName}`);
		} catch (error) {
			console.error(`  Error creating plan ${planData.name}:`, error);
		}
	}

	console.log("Done seeding plans!");
	process.exit(0);
}

seed().catch((error) => {
	console.error("Seed failed:", error);
	process.exit(1);
});
