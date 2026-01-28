"use client";

import { Clock, Headphones, MessageSquare, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AgentStatusSelector } from "./agent-status-selector";
import { ConversationPanel } from "./conversation-panel";
import { ConversationQueue } from "./conversation-queue";

interface QueueStats {
	waiting: number;
	assigned: number;
	avgWaitTime: number;
}

interface QueueItem {
	id: string;
	conversationId: string;
	status: "waiting" | "assigned" | "resolved";
	priority: number;
	department: string | null;
	aiSummary: string | null;
	waitingSince: string;
	conversation?: {
		id: string;
		visitorId: string;
		metadata?: {
			pageUrl?: string;
		};
	};
}

export function AdminLiveChatTab() {
	const [queue, setQueue] = useState<QueueItem[]>([]);
	const [stats, setStats] = useState<QueueStats>({
		waiting: 0,
		assigned: 0,
		avgWaitTime: 0,
	});
	const [loading, setLoading] = useState(true);
	const [selectedConversation, setSelectedConversation] = useState<
		string | null
	>(null);

	const fetchQueue = useCallback(async () => {
		try {
			const response = await fetch("/api/admin/queue?stats=true&messages=true");
			const data = await response.json();
			setQueue(data.queue || []);
			setStats(data.stats || { waiting: 0, assigned: 0, avgWaitTime: 0 });
		} catch (error) {
			console.error("Error fetching queue:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchQueue();
		// Poll for updates every 10 seconds
		const interval = setInterval(fetchQueue, 10000);
		return () => clearInterval(interval);
	}, [fetchQueue]);

	const handleAssign = async (queueItemId: string) => {
		try {
			await fetch(`/api/admin/queue/${queueItemId}/assign`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			fetchQueue();
		} catch (error) {
			console.error("Error assigning:", error);
		}
	};

	const handleResolve = async (queueItemId: string) => {
		try {
			await fetch(`/api/admin/queue/${queueItemId}/assign`, {
				method: "DELETE",
			});
			fetchQueue();
			if (
				queue.find((q) => q.id === queueItemId)?.conversationId ===
				selectedConversation
			) {
				setSelectedConversation(null);
			}
		} catch (error) {
			console.error("Error resolving:", error);
		}
	};

	return (
		<div className="space-y-6">
			{/* Stats and Status */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">Your Status</CardTitle>
						<Headphones className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<AgentStatusSelector />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">Waiting</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.waiting}</div>
						<p className="text-xs text-muted-foreground">
							conversations in queue
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">Assigned</CardTitle>
						<MessageSquare className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.assigned}</div>
						<p className="text-xs text-muted-foreground">
							active conversations
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{Math.round(stats.avgWaitTime / 60)}m
						</div>
						<p className="text-xs text-muted-foreground">average wait time</p>
					</CardContent>
				</Card>
			</div>

			{/* Main content */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Queue */}
				<Card>
					<CardHeader>
						<CardTitle>Conversation Queue</CardTitle>
						<CardDescription>
							Conversations waiting for or assigned to agents
						</CardDescription>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="flex h-40 items-center justify-center">
								<div className="text-muted-foreground">Loading queue...</div>
							</div>
						) : queue.length === 0 ? (
							<div className="flex h-40 items-center justify-center">
								<div className="text-muted-foreground">
									No conversations in queue
								</div>
							</div>
						) : (
							<ConversationQueue
								queue={queue}
								onSelect={(conversationId) =>
									setSelectedConversation(conversationId)
								}
								onAssign={handleAssign}
								onResolve={handleResolve}
								selectedId={selectedConversation}
							/>
						)}
					</CardContent>
				</Card>

				{/* Conversation panel */}
				<Card>
					<CardHeader>
						<CardTitle>Conversation</CardTitle>
						<CardDescription>
							{selectedConversation
								? "View and respond to messages"
								: "Select a conversation from the queue"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{selectedConversation ? (
							<ConversationPanel
								conversationId={selectedConversation}
								onClose={() => setSelectedConversation(null)}
							/>
						) : (
							<div className="flex h-80 items-center justify-center text-muted-foreground">
								Select a conversation to view messages
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
