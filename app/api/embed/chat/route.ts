import { NextResponse } from "next/server";
import { generateText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import { searchKnowledgeDirect } from "@/lib/ai/tools/search-knowledge";
import { detectLanguage, translateUrl, getLearnMoreText } from "@/lib/utils/language-detector";
import { regularPrompt } from "@/lib/ai/prompts";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // Search knowledge base
    const knowledgeResults = await searchKnowledgeDirect(message);

    // Detect language
    const detectedLang = detectLanguage(message);
    const learnMoreText = getLearnMoreText(detectedLang);

    // Build context with knowledge results - use the same system prompt as main chat
    let context = regularPrompt;

    if (knowledgeResults.length > 0) {
      const uniqueUrls = Array.from(
        new Set(knowledgeResults.map(r => r.url).filter(Boolean))
      ).map(url => translateUrl(url as string, detectedLang));

      context += `\n\nKnowledge base results:\n${knowledgeResults
        .map(r => r.content)
        .join("\n\n")}`;

      if (uniqueUrls.length > 0) {
        context += `\n\nInclude these links at the end of your response:\n${learnMoreText}\n${uniqueUrls.map(url => `- ${url}`).join("\n")}`;
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

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Embed chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
