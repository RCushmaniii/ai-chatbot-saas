import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requirePermission } from "@/lib/auth";
import { documents } from "@/lib/db/schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function POST(request: Request) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		const body = await request.json();
		const { content, url, metadata } = body;

		if (!content) {
			return Response.json({ error: "Content is required" }, { status: 400 });
		}

		// Create embedding
		const { embedding } = await embed({
			model: openai.embedding("text-embedding-3-small"),
			value: content,
		});

		// Insert into database scoped to business
		await db.insert(documents).values({
			businessId: user.businessId,
			content,
			url: url || null,
			embedding: embedding as any,
			metadata: JSON.stringify(metadata || {}),
		});

		return Response.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error adding knowledge:", error);
		return Response.json({ error: "Failed to add content" }, { status: 500 });
	}
}

export async function GET(_request: Request) {
	try {
		const { user, error } = await requirePermission("knowledge:view");
		if (error) return error;

		// Get documents scoped to this business
		const allDocuments = await client`
			SELECT id, content, url, metadata, "createdAt"
			FROM "Document_Knowledge"
			WHERE business_id = ${user.businessId}
			ORDER BY "createdAt" DESC
			LIMIT 50
		`;

		return Response.json({ documents: allDocuments }, { status: 200 });
	} catch (error) {
		console.error("Error fetching knowledge:", error);
		return Response.json({ error: "Failed to fetch content" }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return Response.json({ error: "ID is required" }, { status: 400 });
		}

		// Validate id is a number to prevent SQL injection
		const numericId = Number.parseInt(id, 10);
		if (Number.isNaN(numericId)) {
			return Response.json({ error: "Invalid ID format" }, { status: 400 });
		}

		// Delete only if it belongs to this business
		await client`
			DELETE FROM "Document_Knowledge"
			WHERE id = ${numericId} AND business_id = ${user.businessId}
		`;

		return Response.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error deleting knowledge:", error);
		return Response.json(
			{ error: "Failed to delete content" },
			{ status: 500 },
		);
	}
}
