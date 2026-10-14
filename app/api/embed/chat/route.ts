import { openai } from "@ai-sdk/openai";
import * as Sentry from "@sentry/nextjs";
import { generateText } from "ai";
import { NextResponse } from "next/server";
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
import {
	searchKnowledgeDirect,
	warmKnowledgeSearch,
} from "@/lib/ai/tools/search-knowledge";
import { getBusinessPersona } from "@/lib/db/queries";
import {
	checkMessageLimit,
	incrementMessageCount,
} from "@/lib/db/queries-billing";
import {
	createWidgetConversation,
	createWidgetMessage,
	getWidgetConversationBySession,
} from "@/lib/db/queries-live-chat";
import { isQaGateRequest } from "@/lib/embed/internal-traffic";
import { resolveModelOverride } from "@/lib/embed/model-override";
import { createTimer } from "@/lib/embed/server-timing";
import { resolveEmbedTenant } from "@/lib/embed/tenant";
import { playbookEngine } from "@/lib/playbook/engine";
import { rateLimit } from "@/lib/rate-limit";
import {
	detectLanguage,
	getLearnMoreText,
	translateUrl,
} from "@/lib/utils/language-detector";

/**
 * Shown when a deployment has no persona configured for its business. Neutral by
 * design: it names no company, because the whole point is that we do not know
 * which company this is supposed to be.
 */
const UNCONFIGURED_REPLY: Record<string, string> = {
	en: "This assistant isn't set up yet, so I can't answer questions right now. Please use the contact details on this page and someone will get back to you.",
	es: "Este asistente aún no está configurado, así que por ahora no puedo responder preguntas. Usa los datos de contacto de esta página y con gusto te atendemos.",
};

export async function POST(request: Request) {
	/**
	 * Every reply carries Server-Timing (ratelimit, quota, log, persona, embed,
	 * search, pre = everything before the model, model, save) and X-Chat-Model
	 * (the model that actually wrote it). Read by scripts/qa-gate.ts.
	 */
	const timer = createTimer();
	let modelId: string | null = null;
	const respond = (body: unknown, init?: ResponseInit) => {
		const headers = new Headers(init?.headers);
		headers.set("Server-Timing", timer.header());
		if (modelId) headers.set("X-Chat-Model", modelId);
		// Lets the gate confirm it is not being counted as a visitor.
		if (internal) headers.set("X-Traffic", "internal");
		return NextResponse.json(body, { ...init, headers });
	};

	// QA gate traffic (token-checked): tagged internal, not counted as usage.
	const internal = isQaGateRequest(request);
	const modelOverride = resolveModelOverride(request);

	// Rate limit: 30 messages per minute per IP
	const rateLimitResponse = await timer.time("ratelimit", () =>
		rateLimit(request, "embed-chat", {
			maxRequests: 30,
			windowSeconds: 60,
		}),
	);
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
			return respond({ error: "Invalid message" }, { status: 400 });
		}

		// The business is this deployment's, never the request's — a visitor who
		// names another tenant's id is refused, not answered as that tenant.
		// See lib/embed/tenant.ts.
		const tenant = resolveEmbedTenant({ businessId, botId });
		if (!tenant.ok) {
			console.warn(`[embed-chat] refused ${tenant.reason}`, { origin });
			return respond({ error: "Unknown business" }, { status: 403 });
		}
		const effectiveBusinessId = tenant.businessId;
		const effectiveBotId = tenant.botId;

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
			return respond({
				response: safeReply,
				conversationId: existingConversationId,
				playbook: { active: false },
			});
		}

		// Check plan-based monthly message limit for the business
		if (effectiveBusinessId) {
			const limitCheck = await timer.time("quota", () =>
				checkMessageLimit({ businessId: effectiveBusinessId }),
			);
			if (!limitCheck.allowed) {
				return respond(
					{
						error: "Monthly message limit reached. Please upgrade your plan.",
						response:
							"Lo siento, este negocio ha alcanzado su l\u00edmite mensual de mensajes. Por favor, int\u00e9ntalo m\u00e1s tarde.",
					},
					{ status: 429 },
				);
			}
		}

		/**
		 * Get or create the conversation — this is what RECORDS the chat.
		 *
		 * This guard used to read `if (businessId && visitorId && sessionId)`,
		 * against the RAW request body, while the answer path below used
		 * effectiveBusinessId (body value OR the deployment default). The widget
		 * sent none of the three, so the guard was false on every request and this
		 * block never executed in production: WidgetConversation, WidgetMessage and
		 * Contact were empty for every tenant while the widget served 126 pages.
		 * The bot answered correctly the whole time, which is precisely why it went
		 * unnoticed.
		 *
		 * It now uses the same effective ids as the answer path, so recording and
		 * answering can never disagree about which business a message belongs to.
		 *
		 * visitorId and sessionId remain REQUIRED and must not be defaulted away.
		 * Without them getWidgetConversationBySession can never match an existing
		 * row, so every message would open its own conversation — a table full of
		 * one-message transcripts, which is worse than an empty one because it
		 * looks like data.
		 */
		let conversationId = existingConversationId;
		let isFirstMessage = false;

		if (effectiveBusinessId && visitorId && sessionId) {
			const tLog = performance.now();
			let conversation = await getWidgetConversationBySession({
				businessId: effectiveBusinessId,
				visitorId,
				sessionId,
			});

			if (!conversation) {
				conversation = await createWidgetConversation({
					businessId: effectiveBusinessId,
					botId: effectiveBotId,
					visitorId,
					sessionId,
					metadata: {
						pageUrl: currentUrl,
						origin,
						...(internal ? { internal: true } : {}),
					},
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
			if (!internal) {
				await incrementMessageCount({ businessId: effectiveBusinessId });
			}
			timer.add("log", performance.now() - tLog);

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

				return respond({
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
				businessId: effectiveBusinessId,
				botId: effectiveBotId,
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

				return respond({
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
		if (effectiveBusinessId && !conversationId && !internal) {
			await incrementMessageCount({ businessId: effectiveBusinessId });
		}

		// Search knowledge base (tenant-isolated by businessId)
		const knowledgeResults = effectiveBusinessId
			? await searchKnowledgeDirect(message, {
					businessId: effectiveBusinessId,
					botId: effectiveBotId,
					onTiming: (step, ms) => timer.add(step, ms),
				})
			: [];

		// Detect language
		const detectedLang = detectLanguage(message);
		const learnMoreText = getLearnMoreText(detectedLang);

		/**
		 * The business's own persona. A missing one is a CONFIGURATION FAILURE, and
		 * it is answered as one.
		 *
		 * This used to read `?? regularPrompt`. regularPrompt is the legacy
		 * single-tenant New York English Teacher prompt — it opens "I am an AI
		 * assistant for New York English Teacher (nyenglishteacher.com)" and hands
		 * out nyenglishteacher.com/en/book/ as the booking link. So any deployment
		 * whose DEFAULT_BUSINESS_ID was unset, wrong, or whose owner bot_settings
		 * row was missing would keep answering visitors — fluently, confidently,
		 * and as a different company. On cushlabs.ai that is the front door of the
		 * business introducing itself as an English school.
		 *
		 * One tenant's identity must never be another tenant's silent default. The
		 * widget now says it is not configured and reports it, which is a bad
		 * minute instead of an unbounded number of misbranded conversations.
		 */
		const persona = effectiveBusinessId
			? await timer.time("persona", () =>
					getBusinessPersona(effectiveBusinessId),
				)
			: null;

		if (!persona) {
			Sentry.captureMessage("embed-chat: no persona configured", {
				level: "error",
				extra: {
					businessId: effectiveBusinessId ?? null,
					botId: effectiveBotId ?? null,
					hasDefaultBusinessId: Boolean(process.env.DEFAULT_BUSINESS_ID),
					origin,
				},
			});
			console.error(
				"[embed-chat] no persona for business",
				effectiveBusinessId ?? "(none)",
			);
			return respond(
				{
					response: UNCONFIGURED_REPLY[detectedLang] ?? UNCONFIGURED_REPLY.en,
					conversationId,
					playbook: { active: false },
				},
				// Lets the QA gate stop with "not configured" instead of failing
				// every scenario on the same canned reply.
				{ headers: { "X-Tenant-Configured": "no" } },
			);
		}

		let context = persona;

		if (knowledgeResults.length > 0) {
			// Dedupe AFTER translating, not before. Retrieval routinely returns the
			// EN and ES versions of the same page, which are two distinct URLs until
			// they are localised and then collapse into one — deduping first left
			// the same link listed twice under "Learn more".
			const uniqueUrls = Array.from(
				new Set(
					knowledgeResults
						.map((r) => r.url)
						.filter(Boolean)
						.map((url) => translateUrl(url as string, detectedLang)),
				),
			);

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
		const model = modelOverride
			? openai(modelOverride)
			: myProvider.languageModel(modelKey);
		modelId = model.modelId;
		timer.mark("pre");
		const { text } = await timer.time("model", () =>
			withRetry(
				() =>
					generateText({
						model,
						messages: [
							{ role: "system", content: context },
							{ role: "user", content: message },
						],
					}),
				{ label: "embed-chat:generateText" },
			),
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
			await timer.time("save", () =>
				createWidgetMessage({
					conversationId,
					role: "assistant",
					content: safeText,
				}),
			);
		}

		return respond({
			response: safeText,
			conversationId,
			playbook: { active: false },
		});
	} catch (error) {
		console.error("Embed chat error:", error);
		return respond({ error: "Failed to process message" }, { status: 500 });
	}
}

/** When this instance last warmed. Module scope = one value per instance. */
let lastWarmAt = 0;
const WARM_EVERY_MS = 60_000;

/**
 * Warm-up. The loader calls this once when a visitor first hovers over,
 * touches or focuses the chat button (lib/embed/script.ts), so the function,
 * the database (Neon suspends an idle compute) and the embedding client are
 * awake before the first question. Measured 2026-10-14 before this existed:
 * first answer after a quiet period 6.5s, the next one 2.2s.
 *
 * It touches the same things a real message touches first — rate limiter,
 * persona query, knowledge-search client — and reveals nothing: the body is
 * empty and the persona is never returned. Rate limited like the chat itself,
 * and throttled to one round of work per minute per instance.
 *
 * scripts/qa-gate.ts sends this same request before its first scenario
 * (unless --cold), so its first answer measures what a visitor gets.
 */
export async function GET(request: Request) {
	const headers = {
		"Cache-Control": "no-store",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Expose-Headers": "X-Warm, Server-Timing",
	};

	// Throttled to once a minute per instance: a page full of visitors hovering
	// costs one round of work, not one per hover. Within the minute the instance
	// is already awake, which is the whole point, so it answers at once.
	if (Date.now() - lastWarmAt < WARM_EVERY_MS) {
		return new NextResponse(null, {
			status: 204,
			headers: {
				...headers,
				"X-Warm": "already-warm",
				"Server-Timing": "warm;dur=0",
			},
		});
	}
	lastWarmAt = Date.now();

	// The rate limiter is part of the warm-up on purpose: it is the first
	// database call every real message makes.
	const t0 = performance.now();
	const limited = await rateLimit(request, "embed-warm", {
		maxRequests: 30,
		windowSeconds: 60,
	});
	if (limited) return limited;

	const tenant = resolveEmbedTenant({});
	await Promise.allSettled([
		tenant.ok && tenant.businessId
			? getBusinessPersona(tenant.businessId)
			: Promise.resolve(null),
		warmKnowledgeSearch(),
	]);
	return new NextResponse(null, {
		status: 204,
		headers: {
			...headers,
			"X-Warm": "warmed",
			"Server-Timing": `warm;dur=${(performance.now() - t0).toFixed(1)}`,
		},
	});
}
