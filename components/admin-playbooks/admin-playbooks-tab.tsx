"use client";

import { Edit, MoreHorizontal, Pause, Play, Plus, Trash } from "lucide-react";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Playbook } from "@/lib/db/schema";
import { PlaybookBuilder } from "./playbook-builder";

const statusColors: Record<string, string> = {
	draft: "bg-gray-100 text-gray-800",
	active: "bg-green-100 text-green-800",
	paused: "bg-yellow-100 text-yellow-800",
};

const triggerLabels: Record<string, string> = {
	keyword: "Keyword",
	intent: "Intent",
	url: "URL Pattern",
	manual: "Manual",
	first_message: "First Message",
};

export function AdminPlaybooksTab() {
	const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreate, setShowCreate] = useState(false);
	const [builderPlaybook, setBuilderPlaybook] = useState<Playbook | null>(null);

	const fetchPlaybooks = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetch("/api/admin/playbooks");
			const data = await response.json();
			setPlaybooks(data || []);
		} catch (error) {
			console.error("Error fetching playbooks:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPlaybooks();
	}, [fetchPlaybooks]);

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this playbook?")) return;

		try {
			await fetch(`/api/admin/playbooks/${id}`, { method: "DELETE" });
			fetchPlaybooks();
		} catch (error) {
			console.error("Delete error:", error);
		}
	};

	const handleToggleStatus = async (playbook: Playbook) => {
		try {
			if (playbook.status === "active") {
				await fetch(`/api/admin/playbooks/${playbook.id}/publish`, {
					method: "DELETE",
				});
			} else {
				await fetch(`/api/admin/playbooks/${playbook.id}/publish`, {
					method: "POST",
				});
			}
			fetchPlaybooks();
		} catch (error) {
			console.error("Status toggle error:", error);
		}
	};

	if (builderPlaybook) {
		return (
			<PlaybookBuilder
				playbook={builderPlaybook}
				onBack={() => {
					setBuilderPlaybook(null);
					fetchPlaybooks();
				}}
			/>
		);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Playbooks</CardTitle>
							<CardDescription>
								Create conversation flows to qualify leads and capture
								information
							</CardDescription>
						</div>
						<Button size="sm" onClick={() => setShowCreate(true)}>
							<Plus className="mr-2 h-4 w-4" />
							New Playbook
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex h-40 items-center justify-center">
							<div className="text-muted-foreground">Loading playbooks...</div>
						</div>
					) : playbooks.length === 0 ? (
						<div className="flex h-40 flex-col items-center justify-center gap-2">
							<div className="text-muted-foreground">No playbooks yet</div>
							<Button variant="outline" onClick={() => setShowCreate(true)}>
								Create your first playbook
							</Button>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Trigger</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Priority</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="w-12" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{playbooks.map((playbook) => (
									<TableRow
										key={playbook.id}
										className="cursor-pointer"
										onClick={() => setBuilderPlaybook(playbook)}
									>
										<TableCell className="font-medium">
											{playbook.name}
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{triggerLabels[playbook.triggerType]}
											</Badge>
										</TableCell>
										<TableCell>
											<Badge
												variant="secondary"
												className={statusColors[playbook.status]}
											>
												{playbook.status}
											</Badge>
										</TableCell>
										<TableCell>{playbook.priority}</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{new Date(playbook.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														onClick={(e) => e.stopPropagation()}
													>
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															setBuilderPlaybook(playbook);
														}}
													>
														<Edit className="mr-2 h-4 w-4" />
														Edit Flow
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															handleToggleStatus(playbook);
														}}
													>
														{playbook.status === "active" ? (
															<>
																<Pause className="mr-2 h-4 w-4" />
																Pause
															</>
														) : (
															<>
																<Play className="mr-2 h-4 w-4" />
																Activate
															</>
														)}
													</DropdownMenuItem>
													<DropdownMenuItem
														className="text-destructive"
														onClick={(e) => {
															e.stopPropagation();
															handleDelete(playbook.id);
														}}
													>
														<Trash className="mr-2 h-4 w-4" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<CreatePlaybookDialog
				open={showCreate}
				onClose={() => setShowCreate(false)}
				onSuccess={(playbook) => {
					setShowCreate(false);
					setBuilderPlaybook(playbook);
					fetchPlaybooks();
				}}
			/>
		</>
	);
}

function CreatePlaybookDialog({
	open,
	onClose,
	onSuccess,
}: {
	open: boolean;
	onClose: () => void;
	onSuccess: (playbook: Playbook) => void;
}) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		triggerType: "keyword",
		keywords: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await fetch("/api/admin/playbooks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: formData.name,
					description: formData.description,
					triggerType: formData.triggerType,
					triggerConfig: {
						keywords: formData.keywords
							.split(",")
							.map((k) => k.trim())
							.filter(Boolean),
					},
				}),
			});

			if (!response.ok) throw new Error("Failed to create playbook");

			const playbook = await response.json();
			onSuccess(playbook);
		} catch (error) {
			console.error("Error creating playbook:", error);
			alert("Error creating playbook");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Playbook</DialogTitle>
					<DialogDescription>
						Set up a new conversation flow for your chatbot
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
								placeholder="Lead Qualification"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder="Qualify leads by collecting email and understanding their needs"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="triggerType">Trigger Type</Label>
							<Select
								value={formData.triggerType}
								onValueChange={(value) =>
									setFormData((prev) => ({ ...prev, triggerType: value }))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="keyword">Keyword Match</SelectItem>
									<SelectItem value="first_message">First Message</SelectItem>
									<SelectItem value="url">URL Pattern</SelectItem>
									<SelectItem value="manual">Manual Trigger</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{formData.triggerType === "keyword" && (
							<div className="space-y-2">
								<Label htmlFor="keywords">Keywords (comma-separated)</Label>
								<Input
									id="keywords"
									value={formData.keywords}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											keywords: e.target.value,
										}))
									}
									placeholder="pricing, demo, contact"
								/>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading || !formData.name}>
							{loading ? "Creating..." : "Create & Edit"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
