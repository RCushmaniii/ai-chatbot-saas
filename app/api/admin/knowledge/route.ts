import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getAuthUser } from "@/lib/auth";
import { documents } from "@/lib/db/schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function POST(request: Request) {
	try {
		// Check authentication
		const user = await getAuthUser();
		if (!user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Optional: Add admin role check here
		// if (session.user.role !== 'admin') {
		//   return Response.json({ error: "Forbidden" }, { status: 403 });
		// }

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

		// Insert into database
		await db.insert(documents).values({
			content,
			url: url || "https://www.nyenglishteacher.com",
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
		// Check authentication
		const user = await getAuthUser();
		if (!user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get all documents (using parameterized query)
		const allDocuments = await client`
			SELECT id, content, url, metadata, "createdAt"
			FROM "Document_Knowledge"
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
		// Check authentication
		const user = await getAuthUser();
		if (!user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

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

		await client`
			DELETE FROM "Document_Knowledge"
			WHERE id = ${numericId}
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
