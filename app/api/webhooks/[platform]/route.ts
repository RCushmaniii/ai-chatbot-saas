import { after } from "next/server";
import { getBot } from "@/lib/channels/bot";

/**
 * POST handler for incoming webhook messages (WhatsApp, Slack, etc.)
 * Chat SDK routes the request to the correct adapter based on the platform param.
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ platform: string }> },
) {
	const { platform } = await params;
	const bot = getBot();

	const handler = bot.webhooks[platform as keyof typeof bot.webhooks];
	if (!handler) {
		return new Response(`Unknown platform: ${platform}`, { status: 404 });
	}

	return handler(request, {
		waitUntil: (task: Promise<unknown>) => after(() => task),
	});
}

/**
 * GET handler for webhook verification (WhatsApp uses hub.verify_token challenge).
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ platform: string }> },
) {
	const { platform } = await params;
	const bot = getBot();

	const handler = bot.webhooks[platform as keyof typeof bot.webhooks];
	if (!handler) {
		return new Response(`Unknown platform: ${platform}`, { status: 404 });
	}

	return handler(request);
}
