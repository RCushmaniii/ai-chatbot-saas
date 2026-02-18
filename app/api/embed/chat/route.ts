import { generateText } from "ai";
import { NextResponse } from "next/server";
import { regularPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { searchKnowledgeDirect } from "@/lib/ai/tools/search-knowledge";
import {
	createWidgetConversation,
	createWidgetMessage,
	getWidgetConversationBySession,
} from "@/lib/db/queries-live-chat";
import { playbookEngine } from "@/lib/playbook/engine";
import { rateLimit } from "@/lib/rate-limit";
import {
	detectLanguage,
	getLearnMoreText,
	translateUrl,
} from "@/lib/utils/language-detector";

export async function POST(request: Request) {
	// Rate limit: 30 messages per minute per IP
	const rateLimitResponse = rateLimit(request, "embed-chat", {
		maxRequests: 30,
		windowSeconds: 60,
	});
	if (rateLimitResponse) return rateLimitResponse;

	try {
		const {
			message,
			businessId,
			visitorId,
			sessionId,
			botId,
			conversationId: existingConversationId,
			currentUrl,
		} = await request.json();

		if (!message || typeof message !== "string") {
			return NextResponse.json({ error: "Invalid message" }, { status: 400 });
		}

		// Get or create conversation for playbook tracking
		let conversationId = existingConversationId;
		let isFirstMessage = false;

		if (businessId && visitorId && sessionId) {
			let conversation = await getWidgetConversationBySession({
				businessId,
				visitorId,
				sessionId,
			});

			if (!conversation) {
				conversation = await createWidgetConversation({
					businessId,
					botId,
					visitorId,
					sessionId,
					metadata: { pageUrl: currentUrl },
				});
				isFirstMessage = true;
			}

			conversationId = conversation.id;

			// Save user message
			await createWidgetMessage({
				conversationId,
				role: "user",
				content: message,
			});

			// Check for active playbook execution
			const activeExecution =
				await playbookEngine.getActiveExecution(conversationId);

			if (activeExecution) {
				// Process the playbook step with user input
				const stepResult = await playbookEngine.processStep(
					activeExecution.id,
					message,
				);

				// Save bot response
				if (stepResult.content) {
					await createWidgetMessage({
						conversationId,
						role: "assistant",
						content: stepResult.content,
						playbookStepId: activeExecution.currentStepId || undefined,
					});
				}

				return NextResponse.json({
					response: stepResult.content || "",
					conversationId,
					playbook: {
						active:
							stepResult.type !== "complete" && stepResult.type !== "handoff",
						type: stepResult.type,
						options: stepResult.options,
						variableName: stepResult.variableName,
						validation: stepResult.validation,
					},
				});
			}

			// Check for playbook triggers
			const triggeredPlaybook = await playbookEngine.checkTriggers(message, {
				businessId,
				botId,
				conversationId,
				isFirstMessage,
				currentUrl,
			});

			if (triggeredPlaybook) {
				// Start the playbook
				const execution = await playbookEngine.startPlaybook(
					triggeredPlaybook.id,
					conversationId,
				);

				// Get the first step
				const stepResult = await playbookEngine.processStep(
					execution.executionId,
				);

				// Save bot response
				if (stepResult.content) {
					await createWidgetMessage({
						conversationId,
						role: "assistant",
						content: stepResult.content,
						playbookStepId: execution.currentStepId || undefined,
					});
				}

				return NextResponse.json({
					response: stepResult.content || "",
					conversationId,
					playbook: {
						active: true,
						type: stepResult.type,
						options: stepResult.options,
						variableName: stepResult.variableName,
						validation: stepResult.validation,
					},
				});
			}
		}

		// No active playbook - use AI response
		// Search knowledge base
		const knowledgeResults = await searchKnowledgeDirect(message);

		// Detect language
		const detectedLang = detectLanguage(message);
		const learnMoreText = getLearnMoreText(detectedLang);

		// Build context with knowledge results - use the same system prompt as main chat
		let context = regularPrompt;

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
				{ role: "user", content: message },
			],
		});

		// Save bot response
		if (conversationId) {
			await createWidgetMessage({
				conversationId,
				role: "assistant",
				content: text,
			});
		}

		return NextResponse.json({
			response: text,
			conversationId,
			playbook: { active: false },
		});
	} catch (error) {
		console.error("Embed chat error:", error);
		return NextResponse.json(
			{ error: "Failed to process message" },
			{ status: 500 },
		);
	}
}
