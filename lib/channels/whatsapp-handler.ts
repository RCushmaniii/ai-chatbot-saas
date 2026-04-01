import { generateText } from "ai";
import type { Message, Thread } from "chat";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { regularPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { searchKnowledgeDirect } from "@/lib/ai/tools/search-knowledge";
import {
	checkMessageLimit,
	incrementMessageCount,
} from "@/lib/db/queries-billing";
import {
	createWidgetConversation,
	createWidgetMessage,
} from "@/lib/db/queries-live-chat";
import { whatsappPhoneMapping, widgetConversation } from "@/lib/db/schema";
import { playbookEngine } from "@/lib/playbook/engine";
import {
	detectLanguage,
	getLearnMoreText,
	translateUrl,
} from "@/lib/utils/language-detector";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * Resolve which business owns the WhatsApp phone number that received this message.
 * The thread ID format from Chat SDK is: whatsapp:{phoneNumberId}:{userWaId}
 */
async function resolveBusinessId(
	threadId: string,
): Promise<{ businessId: string; phoneNumberId: string } | null> {
	const parts = threadId.split(":");
	if (parts.length < 3 || parts[0] !== "whatsapp") return null;

	const phoneNumberId = parts[1];

	const mapping = await db
		.select()
		.from(whatsappPhoneMapping)
		.where(
			and(
				eq(whatsappPhoneMapping.phoneNumberId, phoneNumberId),
				eq(whatsappPhoneMapping.isActive, true),
			),
		)
		.limit(1);

	if (mapping.length === 0) return null;
	return { businessId: mapping[0].businessId, phoneNumberId };
}

/**
 * Extract the user's WhatsApp phone number from the thread ID.
 */
function extractUserPhone(threadId: string): string {
	const parts = threadId.split(":");
	return parts[2] || "unknown";
}

/**
 * Get or create a conversation for this WhatsApp user + business pair.
 */
async function getOrCreateConversation(
	businessId: string,
	phoneNumber: string,
	whatsappName?: string,
): Promise<{ conversationId: string; isFirstMessage: boolean }> {
	// Look for an active conversation with this phone number
	const existing = await db
		.select()
		.from(widgetConversation)
		.where(
			and(
				eq(widgetConversation.businessId, businessId),
				eq(widgetConversation.phoneNumber, phoneNumber),
				eq(widgetConversation.channel, "whatsapp"),
				eq(widgetConversation.status, "active"),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		return { conversationId: existing[0].id, isFirstMessage: false };
	}

	// Create a new conversation
	const conversation = await createWidgetConversation({
		businessId,
		visitorId: `wa:${phoneNumber}`,
		sessionId: `wa:${phoneNumber}:${Date.now()}`,
		metadata: { whatsappName },
	});

	// Update the conversation with WhatsApp-specific fields
	await db
		.update(widgetConversation)
		.set({ channel: "whatsapp", phoneNumber })
		.where(eq(widgetConversation.id, conversation.id));

	return { conversationId: conversation.id, isFirstMessage: true };
}

/**
 * Main handler for incoming WhatsApp messages.
 * Mirrors the embed chat route logic: playbook engine → AI fallback.
 */
export async function handleWhatsAppMessage(
	thread: Thread,
	message: Message,
): Promise<void> {
	const threadId = thread.id;
	const userText = message.text?.trim();

	if (!userText) return;

	// 1. Resolve which business this WhatsApp number belongs to
	const resolved = await resolveBusinessId(threadId);
	if (!resolved) {
		await thread.post(
			"Sorry, this WhatsApp number is not configured. Please contact support.",
		);
		return;
	}

	const { businessId } = resolved;
	const userPhone = extractUserPhone(threadId);

	// 2. Check plan-based message limits
	const limitCheck = await checkMessageLimit({ businessId });
	if (!limitCheck.allowed) {
		await thread.post(
			"Lo siento, este negocio ha alcanzado su límite mensual de mensajes. Por favor, inténtalo más tarde. / Sorry, this business has reached its monthly message limit.",
		);
		return;
	}

	// 3. Get or create conversation
	const { conversationId, isFirstMessage } = await getOrCreateConversation(
		businessId,
		userPhone,
		(message as { user?: { name?: string } }).user?.name,
	);

	// 4. Save user message and track usage
	await createWidgetMessage({
		conversationId,
		role: "user",
		content: userText,
		metadata: { channel: "whatsapp", phoneNumber: userPhone },
	});
	await incrementMessageCount({ businessId });

	// 5. Check for active playbook execution
	const activeExecution =
		await playbookEngine.getActiveExecution(conversationId);

	if (activeExecution) {
		const stepResult = await playbookEngine.processStep(
			activeExecution.id,
			userText,
		);

		if (stepResult.content) {
			await createWidgetMessage({
				conversationId,
				role: "assistant",
				content: stepResult.content,
				playbookStepId: activeExecution.currentStepId || undefined,
			});
			await thread.post(stepResult.content);
		}

		// If playbook step has options, send as WhatsApp interactive buttons
		if (
			stepResult.options &&
			stepResult.options.length > 0 &&
			stepResult.options.length <= 3
		) {
			// WhatsApp supports up to 3 interactive reply buttons
			// TODO: Use Chat SDK cards/actions for interactive buttons
		}

		return;
	}

	// 6. Check for playbook triggers
	const triggeredPlaybook = await playbookEngine.checkTriggers(userText, {
		businessId,
		conversationId,
		isFirstMessage,
	});

	if (triggeredPlaybook) {
		const execution = await playbookEngine.startPlaybook(
			triggeredPlaybook.id,
			conversationId,
		);

		const stepResult = await playbookEngine.processStep(execution.executionId);

		if (stepResult.content) {
			await createWidgetMessage({
				conversationId,
				role: "assistant",
				content: stepResult.content,
				playbookStepId: execution.currentStepId || undefined,
			});
			await thread.post(stepResult.content);
		}

		return;
	}

	// 7. No active playbook — use AI response (same as embed chat)
	const knowledgeResults = await searchKnowledgeDirect(userText);
	const detectedLang = detectLanguage(userText);
	const learnMoreText = getLearnMoreText(detectedLang);

	let context = regularPrompt;

	// Add WhatsApp-specific instructions
	context +=
		"\n\nYou are responding via WhatsApp. Keep responses concise and mobile-friendly (under 500 words). Do not use markdown formatting — WhatsApp uses plain text with *bold* and _italic_ only. Do not reference artifacts, documents, or code editors.";

	if (knowledgeResults.length > 0) {
		const uniqueUrls = Array.from(
			new Set(knowledgeResults.map((r) => r.url).filter(Boolean)),
		).map((url) => translateUrl(url as string, detectedLang));

		context += `\n\nKnowledge base results:\n${knowledgeResults
			.map((r) => r.content)
			.join("\n\n")}`;

		if (uniqueUrls.length > 0) {
			context += `\n\nInclude these links at the end of your response:\n${learnMoreText}\n${uniqueUrls.map((url) => `- ${url}`).join("\n")}`;
		}
	}

	// Generate response
	const model = myProvider.languageModel("chat-model");
	const { text } = await generateText({
		model,
		messages: [
			{ role: "system", content: context },
			{ role: "user", content: userText },
		],
	});

	// Save and send response
	await createWidgetMessage({
		conversationId,
		role: "assistant",
		content: text,
		metadata: { channel: "whatsapp" },
	});

	await thread.post(text);
}
