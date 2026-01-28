"use client";

import { Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
	id: string;
	role: "user" | "assistant" | "agent" | "system";
	content: string;
	createdAt: string;
}

interface ConversationPanelProps {
	conversationId: string;
	onClose: () => void;
}

const roleColors: Record<string, string> = {
	user: "bg-blue-100",
	assistant: "bg-gray-100",
	agent: "bg-green-100",
	system: "bg-yellow-100",
};

const roleLabels: Record<string, string> = {
	user: "Visitor",
	assistant: "AI Bot",
	agent: "Agent",
	system: "System",
};

export function ConversationPanel({
	conversationId,
	onClose,
}: ConversationPanelProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [sending, setSending] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	const fetchMessages = useCallback(async () => {
		try {
			const response = await fetch(
				`/api/admin/conversations/${conversationId}/messages`,
			);
			const data = await response.json();
			setMessages(data || []);
		} catch (error) {
			console.error("Error fetching messages:", error);
		}
	}, [conversationId]);

	useEffect(() => {
		fetchMessages();
		// Poll for new messages every 3 seconds
		const interval = setInterval(fetchMessages, 3000);
		return () => clearInterval(interval);
	}, [fetchMessages]);

	useEffect(() => {
		// Scroll to bottom when messages change
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSend = async () => {
		if (!newMessage.trim() || sending) return;

		setSending(true);
		try {
			await fetch(`/api/admin/conversations/${conversationId}/messages`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: newMessage }),
			});
			setNewMessage("");
			fetchMessages();
		} catch (error) {
			console.error("Error sending message:", error);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="flex h-80 flex-col">
			<div className="flex items-center justify-between pb-2 border-b">
				<span className="text-sm font-medium">
					Conversation {conversationId.slice(0, 8)}...
				</span>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			<ScrollArea className="flex-1 py-4" ref={scrollRef}>
				<div className="space-y-4">
					{messages.map((message) => (
						<div
							key={message.id}
							className={`flex flex-col gap-1 ${
								message.role === "user" ? "items-start" : "items-end"
							}`}
						>
							<span className="text-xs text-muted-foreground">
								{roleLabels[message.role]}
							</span>
							<div
								className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${roleColors[message.role]}`}
							>
								{message.content}
							</div>
							<span className="text-xs text-muted-foreground">
								{new Date(message.createdAt).toLocaleTimeString()}
							</span>
						</div>
					))}
				</div>
			</ScrollArea>

			<div className="flex gap-2 pt-2 border-t">
				<Input
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
					placeholder="Type your message..."
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSend();
						}
					}}
				/>
				<Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
					<Send className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
