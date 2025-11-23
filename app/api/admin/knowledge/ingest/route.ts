import { auth } from "@/app/(auth)/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const maxDuration = 300; // 5 minutes for ingestion

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sitemapUrl } = await request.json();

    if (!sitemapUrl) {
      return Response.json(
        { error: "Sitemap URL is required" },
        { status: 400 }
      );
    }

    // Update the sitemap URL in the ingest script config
    // For now, we'll just run the existing script
    // In production, you might want to pass the URL as an environment variable

    console.log("Starting ingestion for sitemap:", sitemapUrl);

    // Run the ingestion script
    const { stdout, stderr } = await execAsync("pnpm run ingest", {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SITEMAP_URL: sitemapUrl,
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
    const chunksCreated = chunksMatch ? parseInt(chunksMatch[1]) : 0;

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
        { error: "Ingestion timed out. The website may be too large. Try running 'pnpm run ingest' manually." },
        { status: 504 }
      );
    }

    return Response.json(
      { error: error.message || "Failed to run ingestion" },
      { status: 500 }
    );
  }
}
