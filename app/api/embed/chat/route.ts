import { generateText } from "ai";
import { NextResponse } from "next/server";
import { regularPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { withRetry } from "@/lib/ai/retry";
import { routeModel } from "@/lib/ai/router";
import {
	checkInput,
	SAFE_REJECTION_MESSAGES,
} from "@/lib/ai/safety/input-guard";
import {
	checkOutput,
	SAFE_OUTPUT_FALLBACK,
} from "@/lib/ai/safety/output-guard";
import { searchKnowledgeDirect } from "@/lib/ai/tools/search-knowledge";
import {
	checkMessageLimit,
	incrementMessageCount,
} from "@/lib/db/queries-billing";
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
	const rateLimitResponse = await rateLimit(request, "embed-chat", {
		maxRequests: 30,
		windowSeconds: 60,
	});
	if (rateLimitResponse) return rateLimitResponse;

	// Capture the embedding origin so abuse can be traced back to a host site.
	// Validating against a per-business allowlist requires a schema change and
	// is deferred to post-launch; logging is the launch-day mitigation.
	const origin =
		request.headers.get("origin") || request.headers.get("referer") || null;

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

		// Input safety: refuse prompt-injection attempts before they reach the model.
		const inputCheck = checkInput(message);
		if (!inputCheck.ok) {
			const lang = detectLanguage(message);
			const reason = inputCheck.reason ?? "injection";
			const safeReply = SAFE_REJECTION_MESSAGES[reason][lang];
			console.warn(
				`[embed-chat] input rejected (${reason})${
					inputCheck.pattern ? ` pattern=${inputCheck.pattern}` : ""
				}`,
			);
			return NextResponse.json({
				response: safeReply,
				conversationId: existingConversationId,
				playbook: { active: false },
			});
		}

		// Check plan-based monthly message limit for the business
		if (businessId) {
			const limitCheck = await checkMessageLimit({ businessId });
			if (!limitCheck.allowed) {
				return NextResponse.json(
					{
						error: "Monthly message limit reached. Please upgrade your plan.",
						response:
							"Lo siento, este negocio ha alcanzado su l\u00edmite mensual de mensajes. Por favor, int\u00e9ntalo m\u00e1s tarde.",
					},
					{ status: 429 },
				);
			}
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
					metadata: { pageUrl: currentUrl, origin },
				});
				isFirstMessage = true;
			}

			conversationId = conversation.id;

			// Save user message and track usage
			await createWidgetMessage({
				conversationId,
				role: "user",
				content: message,
			});
			await incrementMessageCount({ businessId });

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
		// Track usage even when no conversation was created
		if (businessId && !conversationId) {
			await incrementMessageCount({ businessId });
		}

		// Search knowledge base (tenant-isolated by businessId)
		const knowledgeResults = businessId
			? await searchKnowledgeDirect(message, { businessId, botId })
			: [];

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

		// Generate response (with retry on 429/5xx — single 4xx other than
		// 429 is NOT retried since the payload won't get better).
		// Two-model routing: pleasantries → gpt-4o-mini, knowledge → gpt-4o.
		const modelKey = routeModel(message);
		const model = myProvider.languageModel(modelKey);
		const { text } = await withRetry(
			() =>
				generateText({
					model,
					messages: [
						{ role: "system", content: context },
						{ role: "user", content: message },
					],
				}),
			{ label: "embed-chat:generateText" },
		);

		// Output safety: refuse to surface system-prompt leakage or scaffolding.
		const outputCheck = checkOutput(text);
		const safeText = outputCheck.ok ? text : SAFE_OUTPUT_FALLBACK[detectedLang];
		if (!outputCheck.ok) {
			console.warn(
				`[embed-chat] output rejected (${outputCheck.reason})${
					outputCheck.matched ? ` matched=${outputCheck.matched}` : ""
				}`,
			);
		}

		// Save bot response
		if (conversationId) {
			await createWidgetMessage({
				conversationId,
				role: "assistant",
				content: safeText,
			});
		}

		return NextResponse.json({
			response: safeText,
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
