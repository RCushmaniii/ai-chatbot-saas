export const DEFAULT_CHAT_MODEL: string = "chat-model-mini";

export type ChatModel = {
	id: string;
	name: string;
	description: string;
	tier: "free" | "starter" | "pro" | "business";
};

// Tiered model routing based on subscription plan
// Users see "Answer quality" labels, not model names
export const chatModels: ChatModel[] = [
	{
		id: "chat-model-mini",
		name: "Respuesta Rápida",
		description: "Respuestas rápidas y eficientes para consultas generales",
		tier: "free",
	},
	{
		id: "chat-model",
		name: "Respuesta Avanzada",
		description: "Mayor profundidad y precisión en las respuestas",
		tier: "starter",
	},
	{
		id: "chat-model-reasoning",
		name: "Razonamiento Profundo",
		description: "Análisis detallado con razonamiento paso a paso",
		tier: "pro",
	},
];

// Model routing by subscription plan
export const modelByPlan: Record<string, string> = {
	free: "chat-model-mini",
	starter: "chat-model",
	pro: "chat-model",
	business: "chat-model-reasoning",
};
