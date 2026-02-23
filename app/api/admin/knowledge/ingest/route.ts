import { exec } from "node:child_process";
import { promisify } from "node:util";
import { requirePermission } from "@/lib/auth";

const execAsync = promisify(exec);

export const maxDuration = 300; // 5 minutes for ingestion

// Validate URL format to prevent injection
function isValidSitemapUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" || parsed.protocol === "http:";
	} catch {
		return false;
	}
}

export async function POST(request: Request) {
	try {
		const { user, error } = await requirePermission("knowledge:manage");
		if (error) return error;

		const { sitemapUrl } = await request.json();

		if (!sitemapUrl || typeof sitemapUrl !== "string") {
			return Response.json(
				{ error: "Sitemap URL is required" },
				{ status: 400 },
			);
		}

		if (!isValidSitemapUrl(sitemapUrl)) {
			return Response.json(
				{ error: "Invalid sitemap URL. Must be a valid HTTP(S) URL." },
				{ status: 400 },
			);
		}

		console.log(
			`Starting ingestion for sitemap: ${sitemapUrl} (business: ${user.businessId})`,
		);

		// Run the ingestion script
		const { stdout, stderr } = await execAsync("pnpm run ingest", {
			cwd: process.cwd(),
			env: {
				...process.env,
				SITEMAP_URL: sitemapUrl,
				BUSINESS_ID: user.businessId,
			},
			timeout: 280000, // 4 minutes 40 seconds (slightly less than maxDuration)
		});

		console.log("Ingestion stdout:", stdout);
		if (stderr) {
			console.error("Ingestion stderr:", stderr);
		}

		// Parse the output to extract stats
		const pagesMatch = stdout.match(/\[(\d+)\/(\d+)\]/g);
		const chunksMatch = stdout.match(/Total chunks: (\d+)/);

		const pagesProcessed = pagesMatch ? pagesMatch.length : 0;
		const chunksCreated = chunksMatch ? Number.parseInt(chunksMatch[1], 10) : 0;

		return Response.json({
			success: true,
			pagesProcessed,
			chunksCreated,
			message: "Ingestion completed successfully",
		});
	} catch (error: any) {
		console.error("Error running ingestion:", error);

		// Check if it's a timeout error
		if (error.killed || error.signal === "SIGTERM") {
			return Response.json(
				{ error: "Ingestion timed out. The website may be too large." },
				{ status: 504 },
			);
		}

		return Response.json({ error: "Failed to run ingestion" }, { status: 500 });
	}
}
