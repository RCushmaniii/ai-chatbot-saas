import { createPostgresState } from "@chat-adapter/state-pg";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { Chat } from "chat";
import { handleWhatsAppMessage } from "./whatsapp-handler";

export const bot = new Chat({
	userName: "converso",
	adapters: {
		whatsapp: createWhatsAppAdapter(),
	},
	state: createPostgresState(),
});

// All WhatsApp conversations are direct messages
bot.onDirectMessage(async (thread, message) => {
	await handleWhatsAppMessage(thread, message);
});

// TODO: Handle button/list interactions from playbook steps via bot.onAction()
// This will be wired up when interactive WhatsApp buttons are implemented.
