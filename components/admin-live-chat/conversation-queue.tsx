"use client";

import { Check, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

interface ConversationQueueProps {
	queue: QueueItem[];
	onSelect: (conversationId: string) => void;
	onAssign: (queueItemId: string) => void;
	onResolve: (queueItemId: string) => void;
	selectedId: string | null;
}

const statusColors: Record<string, string> = {
	waiting: "bg-yellow-100 text-yellow-800",
	assigned: "bg-blue-100 text-blue-800",
	resolved: "bg-green-100 text-green-800",
};

function formatWaitTime(timestamp: string): string {
	const diff = Date.now() - new Date(timestamp).getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m ago`;
}

export function ConversationQueue({
	queue,
	onSelect,
	onAssign,
	onResolve,
	selectedId,
}: ConversationQueueProps) {
	return (
		<div className="space-y-2">
			{queue.map((item) => (
				<div
					key={item.id}
					className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
						selectedId === item.conversationId
							? "bg-accent border-accent"
							: "hover:bg-muted"
					}`}
					onClick={() => onSelect(item.conversationId)}
				>
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
							<User className="h-5 w-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-medium text-sm">
									{item.conversation?.visitorId.slice(0, 8) || "Unknown"}
								</span>
								<Badge
									variant="secondary"
									className={statusColors[item.status]}
								>
									{item.status}
								</Badge>
								{item.priority > 0 && (
									<Badge variant="destructive" className="text-xs">
										Priority {item.priority}
									</Badge>
								)}
							</div>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Clock className="h-3 w-3" />
								{formatWaitTime(item.waitingSince)}
								{item.department && (
									<>
										<span>•</span>
										<span>{item.department}</span>
									</>
								)}
							</div>
							{item.aiSummary && (
								<p className="mt-1 text-xs text-muted-foreground line-clamp-1">
									{item.aiSummary}
								</p>
							)}
						</div>
					</div>
					<div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
						{item.status === "waiting" && (
							<Button size="sm" onClick={() => onAssign(item.id)}>
								Take
							</Button>
						)}
						{item.status === "assigned" && (
							<Button
								size="sm"
								variant="outline"
								onClick={() => onResolve(item.id)}
							>
								<Check className="mr-1 h-3 w-3" />
								Resolve
							</Button>
						)}
					</div>
				</div>
			))}
		</div>
	);
}
