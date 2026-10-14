import { NextResponse } from "next/server";
import { buildEmbedScript } from "@/lib/embed/script";

/**
 * The widget loader. Nothing from the request goes into the script — see
 * lib/embed/script.ts for why (?id= used to be pasted into the source).
 */
export function GET() {
	const embedScript = buildEmbedScript(
		process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
	);

	return new NextResponse(embedScript, {
		headers: {
			"Content-Type": "application/javascript; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
