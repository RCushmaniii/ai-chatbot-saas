/**
 * Every piece of text a visitor reads in the widget, in English and Mexican
 * Spanish (es-MX, tú), plus the rule for choosing between saved text and these
 * built-ins.
 *
 * THE RULE: each language falls back to ITS OWN built-in text, never to the
 * other language. Saved text with no language (a plain `welcomeMessage`,
 * `placeholder` or `question`) counts as English only. ny-ai-chatbot shipped a
 * single welcome message and English showed on Spanish pages; this repo did
 * the same for the Spanish welcome until 2026-10-14.
 *
 * Used by the chat window, the admin preview and (the bubble welcome) the
 * loader, so all three say the same thing.
 */

export type WidgetLang = "en" | "es";

export const WIDGET_COPY = {
	en: {
		welcomeTitle: "Welcome! 👋",
		welcomeSubtitle: "How can I help you today?",
		bubbleWelcome: "👋 Hi! Ask me anything.",
		quickLabel: "Quick questions:",
		placeholder: "Type your message...",
		suggested: [
			"What do you offer?",
			"How much does it cost?",
			"How can I contact you?",
		],
		send: "Send message",
		close: "Close chat",
		open: "Open chat",
		conversation: "Conversation",
		error: "Sorry, I encountered an error. Please try again.",
		defaultBotName: "AI Assistant",
	},
	es: {
		welcomeTitle: "¡Hola! 👋",
		welcomeSubtitle: "¿En qué puedo ayudarte hoy?",
		bubbleWelcome: "👋 ¡Hola! Pregúntame lo que quieras.",
		quickLabel: "Preguntas rápidas:",
		placeholder: "Escribe un mensaje...",
		suggested: ["¿Qué ofrecen?", "¿Cuánto cuesta?", "¿Cómo los contacto?"],
		send: "Enviar mensaje",
		close: "Cerrar chat",
		open: "Abrir chat",
		conversation: "Conversación",
		error: "Lo siento, hubo un error. Por favor, intenta de nuevo.",
		defaultBotName: "Asistente de IA",
	},
} as const;

export interface SavedWidgetText {
	welcomeMessage?: unknown;
	welcomeMessage_es?: unknown;
	placeholder?: unknown;
	placeholder_es?: unknown;
}

export interface SavedStarterQuestion {
	question?: unknown;
	question_es?: unknown;
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * The tenant's own text for one language, or undefined where they saved none
 * in THAT language. Undefined means "use WIDGET_COPY[lang]" — never the other
 * language's saved text.
 */
export function localizeWidgetText(
	saved: SavedWidgetText | null | undefined,
	questions: SavedStarterQuestion[] | null | undefined,
	lang: WidgetLang,
): {
	welcomeMessage?: string;
	placeholder?: string;
	suggestedQuestions?: string[];
} {
	const s = saved ?? {};
	const list = (questions ?? [])
		.map((q) => text(lang === "es" ? q?.question_es : q?.question))
		.filter((q): q is string => Boolean(q));
	return {
		welcomeMessage: text(
			lang === "es" ? s.welcomeMessage_es : s.welcomeMessage,
		),
		placeholder: text(lang === "es" ? s.placeholder_es : s.placeholder),
		// An empty list means "none in this language", which falls back too: an
		// empty array would show the "Quick questions:" heading over nothing.
		suggestedQuestions: list.length > 0 ? list : undefined,
	};
}

/**
 * The widget's language: an explicit attribute, then the page's own
 * <html lang>. Anything Spanish ("es", "es-MX", "ES") is Spanish; everything
 * else is English. The loader carries a plain-JS copy of this rule
 * (lib/embed/script.ts, pickLanguage); tests/unit/embed-widget-text.test.ts
 * runs both on the same inputs.
 */
export function pickLanguage(
	dataLanguage: string | null | undefined,
	language: string | null | undefined,
	htmlLang: string | null | undefined,
): WidgetLang {
	const first = [dataLanguage, language, htmlLang].find(
		(v) => typeof v === "string" && v.trim() !== "",
	);
	return first && /^es\b/i.test(first.trim()) ? "es" : "en";
}
