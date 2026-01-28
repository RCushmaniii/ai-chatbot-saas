"use client";

import { AlertCircle, Calendar, Clock, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TrainingSuggestionsPanel } from "./training-suggestions-panel";

interface RetrainingConfig {
	enabled: boolean;
	schedule: "daily" | "weekly" | "monthly";
	lastRunAt: string | null;
	nextRunAt: string | null;
}

export function AdminRetrainingTab() {
	const [config, setConfig] = useState<RetrainingConfig | null>(null);
	const [isAvailable, setIsAvailable] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [running, setRunning] = useState(false);

	const fetchConfig = useCallback(async () => {
		try {
			const response = await fetch("/api/admin/retraining/config");
			const data = await response.json();
			setConfig(data.config);
			setIsAvailable(data.isAvailable);
		} catch (error) {
			console.error("Error fetching config:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	const updateConfig = async (updates: Partial<RetrainingConfig>) => {
		if (!isAvailable) return;

		setSaving(true);
		try {
			const response = await fetch("/api/admin/retraining/config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});
			const data = await response.json();
			setConfig(data);
		} catch (error) {
			console.error("Error updating config:", error);
		} finally {
			setSaving(false);
		}
	};

	const runRetraining = async () => {
		setRunning(true);
		try {
			await fetch("/api/admin/retraining/run", { method: "POST" });
			fetchConfig();
		} catch (error) {
			console.error("Error running retraining:", error);
		} finally {
			setRunning(false);
		}
	};

	if (loading) {
		return (
			<Card>
				<CardContent className="flex h-40 items-center justify-center">
					<div className="text-muted-foreground">Loading...</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Feature availability alert */}
			{!isAvailable && (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertTitle>Upgrade Required</AlertTitle>
					<AlertDescription>
						Scheduled retraining is available on Pro and Business plans. Upgrade
						your plan to enable automatic content updates.
					</AlertDescription>
				</Alert>
			)}

			{/* Retraining Config */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<RefreshCw className="h-5 w-5" />
						Scheduled Retraining
					</CardTitle>
					<CardDescription>
						Automatically retrain your chatbot with updated content
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="enabled">Enable Scheduled Retraining</Label>
							<p className="text-sm text-muted-foreground">
								Automatically refresh your knowledge base on a schedule
							</p>
						</div>
						<Switch
							id="enabled"
							checked={config?.enabled || false}
							onCheckedChange={(enabled) => updateConfig({ enabled })}
							disabled={!isAvailable || saving}
						/>
					</div>

					{config?.enabled && (
						<div className="space-y-2">
							<Label htmlFor="schedule">Retraining Schedule</Label>
							<Select
								value={config.schedule}
								onValueChange={(schedule) =>
									updateConfig({
										schedule: schedule as RetrainingConfig["schedule"],
									})
								}
								disabled={!isAvailable || saving}
							>
								<SelectTrigger className="w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="daily">Daily</SelectItem>
									<SelectItem value="weekly">Weekly</SelectItem>
									<SelectItem value="monthly">Monthly</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="flex gap-6 pt-4 border-t">
						<div>
							<div className="text-sm text-muted-foreground">Last Run</div>
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								{config?.lastRunAt
									? new Date(config.lastRunAt).toLocaleString()
									: "Never"}
							</div>
						</div>
						{config?.enabled && config?.nextRunAt && (
							<div>
								<div className="text-sm text-muted-foreground">Next Run</div>
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4" />
									{new Date(config.nextRunAt).toLocaleString()}
								</div>
							</div>
						)}
					</div>

					<div className="pt-4 border-t">
						<Button
							onClick={runRetraining}
							disabled={running}
							variant="outline"
						>
							<Play className="mr-2 h-4 w-4" />
							{running ? "Running..." : "Run Retraining Now"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Training Suggestions */}
			<TrainingSuggestionsPanel />
		</div>
	);
}
