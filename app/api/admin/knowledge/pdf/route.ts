import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { extractText } from "unpdf";
import { getAuthUser } from "@/lib/auth";
import { documents } from "@/lib/db/schema";

// Force Node.js runtime so pdf-parse and Buffer work correctly.
export const runtime = "nodejs";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

function chunkText(text: string, maxLength = 1500) {
	const chunks: string[] = [];
	let current = text.trim();

	while (current.length > maxLength) {
		let splitIndex = current.lastIndexOf("\n\n", maxLength);
		if (splitIndex === -1) {
			splitIndex = maxLength;
		}
		const chunk = current.slice(0, splitIndex).trim();
		if (chunk) {
			chunks.push(chunk);
		}
		current = current.slice(splitIndex).trim();
	}

	if (current.length > 0) {
		chunks.push(current);
	}

	return chunks;
}

export async function POST(request: Request) {
	const user = await getAuthUser();

	if (!user) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;
		const type = formData.get("type") as string;
		const language = formData.get("language") as string;
		const url = formData.get("url") as string;

		if (!file) {
			return Response.json({ error: "No file provided" }, { status: 400 });
		}

		// Validate file type
		if (!file.name.toLowerCase().endsWith(".pdf")) {
			return Response.json(
				{ error: "Invalid file type. Only PDF files are supported." },
				{ status: 400 },
			);
		}

		// Convert file to both Buffer and Uint8Array for compatibility
		const arrayBuffer = await file.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);
		const buffer = Buffer.from(arrayBuffer);

		// Validate buffer size
		if (buffer.length === 0) {
			return Response.json(
				{ error: "PDF file is empty or corrupted" },
				{ status: 400 },
			);
		}

		console.log(
			`[PDF Upload] Processing ${file.name} (${buffer.length} bytes)`,
		);

		// Extract text from PDF with error handling
		// Try unpdf first (modern, TypeScript-native), fallback to pdf-parse
		let text: string;
		try {
			// unpdf requires Uint8Array, not Buffer
			console.log("[PDF Upload] Attempting extraction with unpdf...");
			const result = await extractText(uint8Array);
			text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
			console.log(
				`[PDF Upload] unpdf succeeded, extracted ${text.length} characters`,
			);
		} catch (unpdfError) {
			console.warn(
				"[PDF Upload] unpdf failed, falling back to pdf-parse:",
				unpdfError,
			);
			// Fallback to pdf-parse (load dynamically to avoid module-level require issues)
			try {
				const pdfParse = require("pdf-parse");
				console.log("[PDF Upload] Attempting extraction with pdf-parse...");
				const data = await pdfParse(buffer);
				text = data.text;
				console.log(
					`[PDF Upload] pdf-parse succeeded, extracted ${text.length} characters`,
				);
			} catch (parseError) {
				console.error("[PDF Upload] Both parsers failed:", parseError);
				const errorMsg =
					parseError instanceof Error
						? parseError.message
						: "Unknown parsing error";
				return Response.json(
					{
						error: `PDF parsing failed: ${errorMsg}. The file may be corrupted, password-protected, or in an unsupported format.`,
					},
					{ status: 400 },
				);
			}
		}

		if (!text || text.trim().length === 0) {
			return Response.json(
				{
					error:
						"No text content found in PDF. The file may be scanned images without OCR, or may be empty.",
				},
				{ status: 400 },
			);
		}

		const chunks = chunkText(text);

		for (const chunk of chunks) {
			const { embedding } = await embed({
				model: openai.embedding("text-embedding-3-small"),
				value: chunk,
			});

			await db.insert(documents).values({
				content: chunk,
				url,
				embedding: embedding as any,
				metadata: JSON.stringify({ type, language, sourceFile: file.name }),
			});
		}

		return Response.json({ success: true }, { status: 200 });
	} catch (error) {
		console.error("Error processing PDF knowledge upload:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return Response.json(
			{ error: `Failed to process PDF: ${errorMessage}` },
			{ status: 500 },
		);
	}
}
