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
	["advantages of", "With Next.js, you can ship fast!"],
	["painted this", "This painting is by Monet!"],
	[
		"weather",
		"The current temperature in San Francisco is 17\u00B0C.",
	],
];

function getResponseText(userText: string): string {
	const lower = userText.toLowerCase();
	for (const [pattern, response] of RESPONSES) {
		if (lower.includes(pattern)) return response;
	}
	return "Mock response";
}

/**
 * Creates a mock language model compatible with AI SDK v2 (specificationVersion "v2").
 *
 * Stream format uses `textDelta` (not `delta`) and emits a `finish` chunk —
 * required by AI SDK 5.0's streamText/smoothStream pipeline.
 */
const createMockModel = (): LanguageModel => {
	return {
		specificationVersion: "v2",
		provider: "mock",
		modelId: "mock-model",
		defaultObjectGenerationMode: "tool",
		supportedUrls: [],
		supportsImageUrls: false,
		supportsStructuredOutputs: false,

		doGenerate: async (options: { prompt: MockPrompt }) => {
			const userText = getLastUserText(options.prompt);
			const responseText = getResponseText(userText);

			return {
				rawCall: { rawPrompt: null, rawSettings: {} },
				finishReason: "stop",
				usage: { inputTokens: 10, outputTokens: 20 },
				content: [{ type: "text", text: responseText }],
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
					stream: new ReadableStream({
						start(controller) {
							controller.enqueue({
								type: "tool-call",
								toolCallType: "function",
								toolCallId: "mock-weather-call",
								toolName: "getWeather",
								args: JSON.stringify({ city: "San Francisco" }),
							});
							controller.enqueue({
								type: "finish",
								finishReason: "tool-calls",
								usage: { inputTokens: 10, outputTokens: 20 },
							});
							controller.close();
						},
					}),
					rawCall: { rawPrompt: null, rawSettings: {} },
				};
			}

			// Default: return prompt-specific text response
			const responseText = hasToolResult(options.prompt)
				? "The current temperature in San Francisco is 17\u00B0C."
				: getResponseText(userText);

			return {
				stream: new ReadableStream({
					start(controller) {
						controller.enqueue({
							type: "text-delta",
							textDelta: responseText,
						});
						controller.enqueue({
							type: "finish",
							finishReason: "stop",
							usage: { inputTokens: 10, outputTokens: 20 },
						});
						controller.close();
					},
				}),
				rawCall: { rawPrompt: null, rawSettings: {} },
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

			return {
				stream: new ReadableStream({
					start(controller) {
						controller.enqueue({
							type: "text-delta",
							textDelta: `<think>Thinking about: ${userText}</think>${responseText}`,
						});
						controller.enqueue({
							type: "finish",
							finishReason: "stop",
							usage: { inputTokens: 10, outputTokens: 20 },
						});
						controller.close();
					},
				}),
				rawCall: { rawPrompt: null, rawSettings: {} },
			};
		},
	} as unknown as LanguageModel;
};

export const chatModel = createMockModel();
export const miniModel = createMockModel();
export const reasoningModel = createMockReasoningModel();
export const titleModel = createMockModel();
export const artifactModel = createMockModel();
