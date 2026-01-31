import type { ChatModel } from "./models";

// Subscription plan entitlements (multi-tenant SaaS model)
export type PlanEntitlements = {
	messagesPerMonth: number;
	maxRetrievedChunks: number; // RAG retrieval depth
	maxTokensPerResponse: number;
	availableModelIds: ChatModel["id"][];
	knowledgeBasePagesLimit: number;
	chatbotsLimit: number;
	teamMembersLimit: number;
	features: string[];
	// Competitive features
	playbooksLimit: number;
	playbookStepsLimit: number;
	liveChat: boolean;
	scheduledRetraining: boolean;
};

export const entitlementsByPlan: Record<string, PlanEntitlements> = {
	free: {
		messagesPerMonth: 100,
		maxRetrievedChunks: 3, // Tight RAG limits
		maxTokensPerResponse: 500,
		availableModelIds: ["chat-model-mini"],
		knowledgeBasePagesLimit: 50,
		chatbotsLimit: 1,
		teamMembersLimit: 1,
		playbooksLimit: 1,
		playbookStepsLimit: 5,
		liveChat: false,
		scheduledRetraining: false,
		features: [
			"1 chatbot",
			"50 páginas de conocimiento",
			"100 mensajes/mes",
			"1 playbook básico",
			"Marca Converso",
		],
	},
	starter: {
		messagesPerMonth: 1000,
		maxRetrievedChunks: 4,
		maxTokensPerResponse: 800,
		availableModelIds: ["chat-model-mini", "chat-model"],
		knowledgeBasePagesLimit: 200,
		chatbotsLimit: 2,
		teamMembersLimit: 2,
		playbooksLimit: 3,
		playbookStepsLimit: 15,
		liveChat: false,
		scheduledRetraining: false,
		features: [
			"2 chatbots",
			"200 páginas de conocimiento",
			"1,000 mensajes/mes",
			"3 playbooks",
			"Sin marca Converso",
			"Soporte por email",
		],
	},
	pro: {
		messagesPerMonth: 5000,
		maxRetrievedChunks: 5, // Higher retrieval depth
		maxTokensPerResponse: 1200,
		availableModelIds: ["chat-model-mini", "chat-model"],
		knowledgeBasePagesLimit: 1000,
		chatbotsLimit: 5,
		teamMembersLimit: 5,
		playbooksLimit: 10,
		playbookStepsLimit: 50,
		liveChat: true,
		scheduledRetraining: true,
		features: [
			"5 chatbots",
			"1,000 páginas de conocimiento",
			"5,000 mensajes/mes",
			"10 playbooks",
			"Chat en vivo con agentes",
			"Reentrenamiento programado",
			"Analíticas avanzadas",
			"Integraciones API",
			"Soporte prioritario",
		],
	},
	business: {
		messagesPerMonth: 25000,
		maxRetrievedChunks: 6, // Maximum retrieval depth
		maxTokensPerResponse: 2000,
		availableModelIds: [
			"chat-model-mini",
			"chat-model",
			"chat-model-reasoning",
		],
		knowledgeBasePagesLimit: 10000,
		chatbotsLimit: -1, // Unlimited
		teamMembersLimit: -1, // Unlimited
		playbooksLimit: -1, // Unlimited
		playbookStepsLimit: -1, // Unlimited
		liveChat: true,
		scheduledRetraining: true,
		features: [
			"Chatbots ilimitados",
			"10,000+ páginas de conocimiento",
			"25,000 mensajes/mes",
			"Playbooks ilimitados",
			"Chat en vivo con agentes",
			"Reentrenamiento programado",
			"Razonamiento profundo (IA premium)",
			"SSO empresarial",
			"SLA garantizado",
			"Gerente de cuenta dedicado",
		],
	},
};
