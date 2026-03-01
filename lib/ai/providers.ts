import { openai } from "@ai-sdk/openai";
import {
	customProvider,
	extractReasoningMiddleware,
	wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

// Multi-tenant RAG chatbot with tiered model routing
// - Free tier: gpt-4o-mini (cost-efficient, excellent for RAG)
// - Starter/Pro: gpt-4o (advanced capabilities)
// - Business: o1-mini (deep reasoning)
export const myProvider = isTestEnvironment
	? (() => {
			const {
				artifactModel,
				chatModel,
				reasoningModel,
				titleModel,
				miniModel,
			} = require("./models.mock");
			return customProvider({
				languageModels: {
					"chat-model-mini": miniModel || chatModel,
					"chat-model": chatModel,
					"chat-model-reasoning": wrapLanguageModel({
						model: reasoningModel,
						middleware: extractReasoningMiddleware({ tagName: "think" }),
					}),
					"title-model": titleModel,
					"artifact-model": artifactModel,
				},
			});
		})()
	: customProvider({
			languageModels: {
				// Free tier - gpt-4o-mini: fast, cheap, great for RAG Q&A
				"chat-model-mini": openai("gpt-4o-mini"),
				// Starter/Pro tier - gpt-4o: advanced multimodal
				"chat-model": openai("gpt-4o"),
				// Business tier - o1-mini: deep reasoning
				"chat-model-reasoning": wrapLanguageModel({
					model: openai("o1-mini"),
					middleware: extractReasoningMiddleware({ tagName: "think" }),
				}),
				// Support models
				"title-model": openai("gpt-4o-mini"),
				"artifact-model": openai("gpt-4o"),
			},
		});
