"use client";

import { Check, ExternalLink, FileX, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { TrainingSuggestion } from "@/lib/db/schema";

export function TrainingSuggestionsPanel() {
	const [suggestions, setSuggestions] = useState<TrainingSuggestion[]>([]);
	const [pendingCount, setPendingCount] = useState(0);
	const [loading, setLoading] = useState(true);

	const fetchSuggestions = useCallback(async () => {
		try {
			const response = await fetch("/api/admin/suggestions?status=pending");
			const data = await response.json();
			setSuggestions(data.suggestions || []);
			setPendingCount(data.pendingCount || 0);
		} catch (error) {
			console.error("Error fetching suggestions:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSuggestions();
	}, [fetchSuggestions]);

	const handleAccept = async (id: string) => {
		try {
			await fetch(`/api/admin/suggestions/${id}/accept`, { method: "POST" });
			fetchSuggestions();
		} catch (error) {
			console.error("Error accepting suggestion:", error);
		}
	};

	const handleDismiss = async (id: string) => {
		try {
			await fetch(`/api/admin/suggestions/${id}/accept`, { method: "DELETE" });
			fetchSuggestions();
		} catch (error) {
			console.error("Error dismissing suggestion:", error);
		}
	};

	const typeConfig: Record<
		string,
		{ label: string; icon: React.ReactNode; color: string }
	> = {
		new_page: {
			label: "New Page",
			icon: <Plus className="h-4 w-4" />,
			color: "bg-green-100 text-green-800",
		},
		removed_page: {
			label: "Removed",
			icon: <FileX className="h-4 w-4" />,
			color: "bg-red-100 text-red-800",
		},
		updated_page: {
			label: "Updated",
			icon: <Check className="h-4 w-4" />,
			color: "bg-blue-100 text-blue-800",
		},
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							Training Suggestions
							{pendingCount > 0 && (
								<Badge variant="destructive">{pendingCount}</Badge>
							)}
						</CardTitle>
						<CardDescription>
							Detected changes in your website content
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="flex h-20 items-center justify-center text-muted-foreground">
						Loading...
					</div>
				) : suggestions.length === 0 ? (
					<div className="flex h-20 items-center justify-center text-muted-foreground">
						No pending suggestions. Your content is up to date!
					</div>
				) : (
					<div className="space-y-3">
						{suggestions.map((suggestion) => {
							const config = typeConfig[suggestion.type];
							return (
								<div
									key={suggestion.id}
									className="flex items-center justify-between p-3 border rounded-lg"
								>
									<div className="flex items-center gap-3">
										<Badge variant="secondary" className={config.color}>
											{config.icon}
											<span className="ml-1">{config.label}</span>
										</Badge>
										<div>
											<a
												href={suggestion.url}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-1 text-sm font-medium hover:underline"
											>
												{suggestion.title || suggestion.url}
												<ExternalLink className="h-3 w-3" />
											</a>
											<p className="text-xs text-muted-foreground line-clamp-1">
												{suggestion.url}
											</p>
										</div>
									</div>
									<div className="flex gap-2">
										{suggestion.type === "new_page" && (
											<Button
												size="sm"
												onClick={() => handleAccept(suggestion.id)}
											>
												<Check className="mr-1 h-3 w-3" />
												Train
											</Button>
										)}
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleDismiss(suggestion.id)}
										>
											<X className="h-3 w-3" />
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
