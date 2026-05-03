import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { plan } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET(request: Request) {
	const limited = await rateLimit(request, "plans", {
		maxRequests: 60,
		windowSeconds: 60,
	});
	if (limited) return limited;

	try {
		const plans = await db
			.select()
			.from(plan)
			.where(eq(plan.isActive, true))
			.orderBy(asc(plan.sortOrder));

		return NextResponse.json(plans);
	} catch (error) {
		console.error("Error fetching plans:", error);
		return NextResponse.json(
			{ error: "Failed to fetch plans" },
			{ status: 500 },
		);
	}
}
