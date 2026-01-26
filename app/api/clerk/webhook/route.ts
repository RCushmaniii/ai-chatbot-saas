import type { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import postgres from "postgres";
import { Webhook } from "svix";

const sql = postgres(process.env.POSTGRES_URL!);

export async function POST(req: Request) {
	const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		throw new Error("CLERK_WEBHOOK_SECRET is not set");
	}

	// Get headers
	const headerPayload = await headers();
	const svix_id = headerPayload.get("svix-id");
	const svix_timestamp = headerPayload.get("svix-timestamp");
	const svix_signature = headerPayload.get("svix-signature");

	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response("Missing svix headers", { status: 400 });
	}

	// Get body
	const payload = await req.json();
	const body = JSON.stringify(payload);

	// Verify webhook
	const wh = new Webhook(WEBHOOK_SECRET);
	let evt: WebhookEvent;

	try {
		evt = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		console.error("Webhook verification failed:", err);
		return new Response("Webhook verification failed", { status: 400 });
	}

	const eventType = evt.type;

	// Handle user.created event
	if (eventType === "user.created") {
		const { id, email_addresses, first_name, last_name, image_url } = evt.data;
		const email = email_addresses?.[0]?.email_address;
		const name = [first_name, last_name].filter(Boolean).join(" ") || null;

		if (!email) {
			return new Response("No email found", { status: 400 });
		}

		try {
			// Create user in our database
			const [user] = await sql`
        INSERT INTO "User" (email, clerk_user_id, name, avatar_url, locale)
        VALUES (${email}, ${id}, ${name}, ${image_url}, 'es')
        ON CONFLICT (clerk_user_id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = NOW()
        RETURNING id
      `;

			// Create default business and membership for new user
			const [business] = await sql`
        INSERT INTO "Business" (name, "createdAt")
        VALUES (${name ? `${name}'s Business` : "Mi Negocio"}, NOW())
        RETURNING id
      `;

			await sql`
        INSERT INTO "Membership" ("businessId", "userId", role)
        VALUES (${business.id}, ${user.id}, 'owner')
      `;

			// Create default bot for the business
			await sql`
        INSERT INTO "Bot" ("businessId", name, "createdAt")
        VALUES (${business.id}, 'Mi Chatbot', NOW())
      `;

			// Get default free plan
			const [freePlan] = await sql`
        SELECT id FROM "Plan" WHERE is_default = true LIMIT 1
      `;

			if (freePlan) {
				// Create subscription on free plan
				await sql`
          INSERT INTO "Subscription" (business_id, plan_id, status)
          VALUES (${business.id}, ${freePlan.id}, 'active')
        `;
			}

			console.log(`User created: ${email} (${id})`);
		} catch (error) {
			console.error("Error creating user:", error);
			return new Response("Error creating user", { status: 500 });
		}
	}

	// Handle user.updated event
	if (eventType === "user.updated") {
		const { id, email_addresses, first_name, last_name, image_url } = evt.data;
		const email = email_addresses?.[0]?.email_address;
		const name = [first_name, last_name].filter(Boolean).join(" ") || null;

		try {
			await sql`
        UPDATE "User"
        SET
          email = ${email},
          name = ${name},
          avatar_url = ${image_url},
          updated_at = NOW()
        WHERE clerk_user_id = ${id}
      `;
			console.log(`User updated: ${email} (${id})`);
		} catch (error) {
			console.error("Error updating user:", error);
			return new Response("Error updating user", { status: 500 });
		}
	}

	// Handle user.deleted event
	if (eventType === "user.deleted") {
		const { id } = evt.data;

		if (!id) {
			return new Response("No user ID in delete event", { status: 400 });
		}

		try {
			// Soft delete - just mark as deleted or remove clerk_user_id
			await sql`
        UPDATE "User"
        SET clerk_user_id = NULL, updated_at = NOW()
        WHERE clerk_user_id = ${id}
      `;
			console.log(`User deleted: ${id}`);
		} catch (error) {
			console.error("Error deleting user:", error);
			return new Response("Error deleting user", { status: 500 });
		}
	}

	return new Response("Webhook processed", { status: 200 });
}
