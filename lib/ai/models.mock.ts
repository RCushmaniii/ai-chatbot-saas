import type { LanguageModel } from "ai";

type MockPrompt = Array<{
	role: string;
	content: Array<{ type: string; text?: string; [key: string]: unknown }>;
}>;

/**
 * Extract the last user message text from an AI SDK v2 prompt.
 */
function getLastUserText(prompt: MockPrompt): string {
	for (let i = prompt.length - 1; i >= 0; i--) {
		const msg = prompt[i];
		if (msg.role === "user") {
			for (const part of msg.content) {
				if (part.type === "text" && part.text) return part.text;
			}
		}
	}
	return "";
}

/**
 * Check if the prompt contains tool results (multi-step tool flow).
 */
function hasToolResult(prompt: MockPrompt): boolean {
	return prompt.some((msg) => msg.role === "tool");
}

/**
 * Prompt-specific responses that match test expectations.
 */
const RESPONSES: Array<[pattern: string, response: string]> = [
	["grass green", "It's just green duh!"],
	["sky blue", "It's just blue duh!"],
	["services", "We offer professional language coaching services!"],
	["painted this", "This painting is by Monet!"],
	["weather", "The current temperature in San Francisco is 17\u00B0C."],
];

/**
 * Prompt-specific reasoning text for the reasoning model.
 */
const REASONING: Array<[pattern: string, reasoning: string]> = [
	["sky blue", "The sky is blue because of rayleigh scattering!"],
	["grass green", "Grass is green because of chlorophyll absorption!"],
];

function getResponseText(userText: string): string {
	const lower = userText.toLowerCase();
	for (const [pattern, response] of RESPONSES) {
		if (lower.includes(pattern)) return response;
	}
	return "Mock response";
}

function getReasoningText(userText: string): string {
	const lower = userText.toLowerCase();
	for (const [pattern, reasoning] of REASONING) {
		if (lower.includes(pattern)) return reasoning;
	}
	return `Thinking about: ${userText}`;
}

const MOCK_USAGE = {
	inputTokens: 10,
	outputTokens: 20,
	totalTokens: 30,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Emit stream chunks with small delays between them.
 * This prevents a race condition where the entire response completes
 * before Playwright's waitForResponse starts listening.
 */
function createDelayedStream(
	chunks: Array<Record<string, unknown>>,
): ReadableStream {
	return new ReadableStream({
		async start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(chunk);
				await delay(50);
			}
			controller.close();
		},
	});
}

/**
 * Creates a mock language model implementing LanguageModelV2 stream format.
 *
 * V2 stream parts use `delta` (not `textDelta`) and require:
 * - stream-start (with warnings)
 * - text-start / text-delta / text-end (with id)
 * - finish (with usage including totalTokens)
 *
 * Chunks are emitted with small delays to simulate realistic streaming
 * behavior — required for Playwright E2E tests to reliably capture responses.
 */
const createMockModel = (): LanguageModel => {
	return {
		specificationVersion: "v2",
		provider: "mock",
		modelId: "mock-model",
		supportedUrls: {},

		doGenerate: async (options: { prompt: MockPrompt }) => {
			const userText = getLastUserText(options.prompt);
			const responseText = getResponseText(userText);

			return {
				content: [{ type: "text", text: responseText }],
				finishReason: "stop",
				usage: MOCK_USAGE,
				warnings: [],
			};
		},

		doStream: async (options: { prompt: MockPrompt }) => {
			const userText = getLastUserText(options.prompt);
			const lower = userText.toLowerCase();

			// Weather tool call flow (multi-step):
			// Step 1: model requests getWeather tool
			// Step 2: after tool result, model responds with text
			if (lower.includes("weather") && !hasToolResult(options.prompt)) {
				return {
					stream: createDelayedStream([
						{ type: "stream-start", warnings: [] },
						{
							type: "tool-call",
							toolCallId: "mock-weather-call",
							toolName: "getWeather",
							input: JSON.stringify({ city: "San Francisco" }),
						},
						{
							type: "finish",
							finishReason: "tool-calls",
							usage: MOCK_USAGE,
						},
					]),
				};
			}

			// Default: return prompt-specific text response
			const responseText = hasToolResult(options.prompt)
				? "The current temperature in San Francisco is 17\u00B0C."
				: getResponseText(userText);

			return {
				stream: createDelayedStream([
					{ type: "stream-start", warnings: [] },
					{ type: "text-start", id: "text-1" },
					{ type: "text-delta", id: "text-1", delta: responseText },
					{ type: "text-end", id: "text-1" },
					{
						type: "finish",
						finishReason: "stop",
						usage: MOCK_USAGE,
					},
				]),
			};
		},
	} as unknown as LanguageModel;
};

/**
 * Creates a mock reasoning model that emits <think> tags for
 * extractReasoningMiddleware to process.
 */
const createMockReasoningModel = (): LanguageModel => {
	const base = createMockModel();

	return {
		...base,
		doStream: async (options: { prompt: MockPrompt }) => {
			const userText = getLastUserText(options.prompt);
			const responseText = getResponseText(userText);
			const reasoningText = getReasoningText(userText);

			return {
				stream: createDelayedStream([
					{ type: "stream-start", warnings: [] },
					{ type: "text-start", id: "text-1" },
					{
						type: "text-delta",
						id: "text-1",
						delta: `<think>${reasoningText}</think>${responseText}`,
					},
					{ type: "text-end", id: "text-1" },
					{
						type: "finish",
						finishReason: "stop",
						usage: MOCK_USAGE,
					},
				]),
			};
		},
	} as unknown as LanguageModel;
};

export const chatModel = createMockModel();
export const miniModel = createMockModel();
export const reasoningModel = createMockReasoningModel();
export const titleModel = createMockModel();
export const artifactModel = createMockModel();
