import { createPostgresState } from "@chat-adapter/state-pg";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { Chat } from "chat";
import {
	handleWhatsAppMessage,
	handlePlaybookAction,
} from "./whatsapp-handler";

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

		_bot.onAction(async (event) => {
			if (event.actionId.startsWith("playbook_option:")) {
				await handlePlaybookAction(event);
			}
		});
	}
	return _bot;
}
