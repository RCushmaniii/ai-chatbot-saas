"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Empty by default. A tenant with no persona yet gets a blank field and a
 * placeholder, never another business's identity pre-loaded and one Save click
 * away from being written into their bot.
 *
 * The New York English Teacher instructions that used to sit here are still in
 * lib/ai/prompts.ts for the app they belong to. They do not belong in a
 * multi-tenant default.
 */
const DEFAULT_INSTRUCTIONS = "";

export function AdminSystemInstructions() {
	const [botName, setBotName] = useState("");
	const [customInstructions, setCustomInstructions] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	const loadSettings = useCallback(async () => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/admin/settings");
			if (!response.ok) {
				if (response.status === 404) {
					// No settings yet, use defaults
					setCustomInstructions(DEFAULT_INSTRUCTIONS);
					setBotName("New York English Teacher");
					return;
				}
				throw new Error("Failed to load settings");
			}
			const data = await response.json();
			setBotName(data.botName || "New York English Teacher");
			setCustomInstructions(data.customInstructions || DEFAULT_INSTRUCTIONS);
		} catch (error) {
			console.error("Error loading settings:", error);
			toast.error("Failed to load settings");
			setCustomInstructions(DEFAULT_INSTRUCTIONS);
			setBotName("New York English Teacher");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const response = await fetch("/api/admin/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					botName,
					customInstructions,
				}),
			});

			if (!response.ok) throw new Error("Failed to save settings");

			toast.success("Settings saved successfully!");
			setHasChanges(false);
		} catch (error) {
			console.error("Error saving settings:", error);
			toast.error("Failed to save settings");
		} finally {
			setIsSaving(false);
		}
	};

	/**
	 * There is no longer a default to reset TO — the default is empty, because a
	 * multi-tenant product must not pre-load one business's identity into another
	 * business's bot. So this clears the field, and says so.
	 */
	const handleReset = () => {
		if (
			confirm(
				"Clear the system instructions? Your bot will fall back to whatever is configured for it until you save new instructions.",
			)
		) {
			setCustomInstructions(DEFAULT_INSTRUCTIONS);
			setHasChanges(true);
			toast.info("Instructions cleared. Click Save to apply.");
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Bot Identity</CardTitle>
					<CardDescription>
						Configure your chatbot's name and personality
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="bot-name">Bot Name</Label>
						<Input
							id="bot-name"
							placeholder="e.g., New York English Teacher"
							value={botName}
							onChange={(e) => {
								setBotName(e.target.value);
								setHasChanges(true);
							}}
						/>
						<p className="text-sm text-muted-foreground">
							This name will be used when the bot introduces itself.
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>System Instructions</CardTitle>
					<CardDescription>
						Customize how your chatbot behaves and responds to users. These
						instructions guide the AI's personality, tone, and knowledge scope.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="instructions">Custom Instructions</Label>
						<Textarea
							id="instructions"
							placeholder="Enter custom system instructions..."
							value={customInstructions}
							onChange={(e) => {
								setCustomInstructions(e.target.value);
								setHasChanges(true);
							}}
							rows={20}
							className="font-mono text-sm"
						/>
						<p className="text-sm text-muted-foreground">
							These instructions are added to the system prompt. Use them to
							define the bot's personality, scope, and behavior rules.
						</p>
					</div>

					<div className="flex gap-2">
						<Button
							onClick={handleSave}
							disabled={isSaving || !hasChanges}
							className="flex-1"
						>
							{isSaving ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								<>
									<Save className="mr-2 h-4 w-4" />
									Save Changes
								</>
							)}
						</Button>

						<Button onClick={handleReset} variant="outline">
							<RotateCcw className="mr-2 h-4 w-4" />
							Reset to Default
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Tips for Writing Instructions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-muted-foreground">
					<p>
						• <strong>Be specific:</strong> Clearly define what the bot should
						and shouldn't do
					</p>
					<p>
						• <strong>Use examples:</strong> Show the bot how to respond in
						different scenarios
					</p>
					<p>
						• <strong>Set boundaries:</strong> Define the scope of knowledge and
						when to escalate to humans
					</p>
					<p>
						• <strong>Define tone:</strong> Specify if the bot should be formal,
						casual, encouraging, etc.
					</p>
					<p>
						• <strong>Risk-averse approach:</strong> Include guidelines for
						handling uncertain or out-of-scope questions
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
