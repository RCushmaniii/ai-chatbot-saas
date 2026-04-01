import { createPostgresState } from "@chat-adapter/state-pg";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { Chat } from "chat";
import { handleWhatsAppMessage } from "./whatsapp-handler";

let _bot: Chat | null = null;

export function getBot(): Chat {
	if (!_bot) {
		_bot = new Chat({
			userName: "converso",
			adapters: {
				whatsapp: createWhatsAppAdapter(),
			},
			state: createPostgresState(),
		});

		_bot.onDirectMessage(async (thread, message) => {
			await handleWhatsAppMessage(thread, message);
		});
	}
	return _bot;
}

// TODO: Handle button/list interactions from playbook steps via bot.onAction()
// This will be wired up when interactive WhatsApp buttons are implemented.
