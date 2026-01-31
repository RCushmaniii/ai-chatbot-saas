import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getAuthUser } from "@/lib/auth";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { id } = params;
	const chat = await getChatById({ id });

	if (!chat) {
		notFound();
	}

	const user = await getAuthUser();

	if (!user) {
		redirect("/sign-in");
	}

	if (chat.visibility === "private") {
		if (user.id !== chat.userId) {
			return notFound();
		}
	}

	const messagesFromDb = await getMessagesByChatId({
		id,
	});

	const uiMessages = convertToUIMessages(messagesFromDb);

	const cookieStore = await cookies();
	const chatModelFromCookie = cookieStore.get("chat-model");

	if (!chatModelFromCookie) {
		return (
			<>
				<Chat
					autoResume={true}
					id={chat.id}
					initialChatModel={DEFAULT_CHAT_MODEL}
					initialLastContext={chat.lastContext ?? undefined}
					initialMessages={uiMessages}
					initialVisibilityType={chat.visibility}
					isReadonly={user.id !== chat.userId}
				/>
				<DataStreamHandler />
			</>
		);
	}

	return (
		<>
			<Chat
				autoResume={true}
				id={chat.id}
				initialChatModel={chatModelFromCookie.value}
				initialLastContext={chat.lastContext ?? undefined}
				initialMessages={uiMessages}
				initialVisibilityType={chat.visibility}
				isReadonly={user.id !== chat.userId}
			/>
			<DataStreamHandler />
		</>
	);
}
