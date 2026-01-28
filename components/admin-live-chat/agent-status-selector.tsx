"use client";

import { useEffect, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type AgentStatus = "online" | "away" | "busy" | "offline";

const statusConfig: Record<AgentStatus, { label: string; color: string }> = {
	online: { label: "Online", color: "bg-green-500" },
	away: { label: "Away", color: "bg-yellow-500" },
	busy: { label: "Busy", color: "bg-red-500" },
	offline: { label: "Offline", color: "bg-gray-500" },
};

export function AgentStatusSelector() {
	const [status, setStatus] = useState<AgentStatus | null>(null);
	const [_isAgent, setIsAgent] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const response = await fetch("/api/admin/agents/me/status");
				const data = await response.json();
				setStatus(data.status);
				setIsAgent(data.isAgent);
			} catch (error) {
				console.error("Error fetching agent status:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchStatus();
	}, []);

	const handleStatusChange = async (newStatus: AgentStatus) => {
		try {
			await fetch("/api/admin/agents/me/status", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: newStatus }),
			});
			setStatus(newStatus);
			setIsAgent(true);
		} catch (error) {
			console.error("Error updating status:", error);
		}
	};

	if (loading) {
		return <div className="text-sm text-muted-foreground">Loading...</div>;
	}

	return (
		<Select
			value={status || "offline"}
			onValueChange={(value) => handleStatusChange(value as AgentStatus)}
		>
			<SelectTrigger className="w-full">
				<SelectValue>
					{status && (
						<div className="flex items-center gap-2">
							<div
								className={`h-2 w-2 rounded-full ${statusConfig[status].color}`}
							/>
							{statusConfig[status].label}
						</div>
					)}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{(Object.keys(statusConfig) as AgentStatus[]).map((s) => (
					<SelectItem key={s} value={s}>
						<div className="flex items-center gap-2">
							<div
								className={`h-2 w-2 rounded-full ${statusConfig[s].color}`}
							/>
							{statusConfig[s].label}
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
