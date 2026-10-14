"use client";

import { GripVertical, Loader2, Plus, Save, Trash2 } from "lucide-react";
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

type StarterQuestion = {
	id: string;
	question: string;
	/** Spanish. Saved separately: a question with no Spanish never shows on a Spanish page. */
	question_es?: string;
	emoji?: string;
};

/**
 * Bilingual pairs. These used to be Spanish sentences stored in
 * `question`, the ENGLISH field, so a tenant who pressed "Reset to Default" got Spanish
 * chips on English pages and the built-in ones on Spanish pages.
 */
const DEFAULT_QUESTIONS: StarterQuestion[] = [
	{
		id: "1",
		question: "What do you offer?",
		question_es: "¿Qué ofrecen?",
		emoji: "💬",
	},
	{
		id: "2",
		question: "How much does it cost?",
		question_es: "¿Cuánto cuesta?",
		emoji: "💰",
	},
	{
		id: "3",
		question: "How can I contact you?",
		question_es: "¿Cómo los contacto?",
		emoji: "📅",
	},
];

export function AdminStarterQuestions() {
	const [questions, setQuestions] = useState<StarterQuestion[]>([]);
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
					setQuestions(DEFAULT_QUESTIONS);
					return;
				}
				throw new Error("Failed to load settings");
			}
			const data = await response.json();
			setQuestions(data.starterQuestions || DEFAULT_QUESTIONS);
		} catch (error) {
			console.error("Error loading settings:", error);
			toast.error("Failed to load starter questions");
			setQuestions(DEFAULT_QUESTIONS);
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
					starterQuestions: questions,
				}),
			});

			if (!response.ok) throw new Error("Failed to save settings");

			toast.success("Starter questions saved successfully!");
			setHasChanges(false);
		} catch (error) {
			console.error("Error saving settings:", error);
			toast.error("Failed to save starter questions");
		} finally {
			setIsSaving(false);
		}
	};

	const addQuestion = () => {
		const newQuestion: StarterQuestion = {
			id: Date.now().toString(),
			question: "",
			question_es: "",
			emoji: "💬",
		};
		setQuestions([...questions, newQuestion]);
		setHasChanges(true);
	};

	const updateQuestion = (
		id: string,
		field: keyof StarterQuestion,
		value: string,
	) => {
		setQuestions(
			questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
		);
		setHasChanges(true);
	};

	const deleteQuestion = (id: string) => {
		setQuestions(questions.filter((q) => q.id !== id));
		setHasChanges(true);
	};

	const resetToDefault = () => {
		if (
			confirm(
				"Are you sure you want to reset to default questions? This will overwrite your current questions.",
			)
		) {
			setQuestions(DEFAULT_QUESTIONS);
			setHasChanges(true);
			toast.info("Questions reset to default. Click Save to apply.");
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
					<CardTitle>Starter Questions</CardTitle>
					<CardDescription>
						Suggested questions that appear when users start a new conversation.
						Write each one in English and in Spanish: English pages show the
						English column, Spanish pages the Spanish one. A question left empty
						in one language is simply not shown in that language.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						{questions.map((question, _index) => (
							<div
								key={question.id}
								className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30"
							>
								<div className="flex items-center pt-2 cursor-move">
									<GripVertical className="h-5 w-5 text-muted-foreground" />
								</div>

								<div className="flex-1 space-y-2">
									<div className="flex gap-2">
										<div className="w-20">
											<Input
												placeholder="📅"
												value={question.emoji || ""}
												onChange={(e) =>
													updateQuestion(question.id, "emoji", e.target.value)
												}
												className="text-center text-xl"
												maxLength={2}
											/>
										</div>
										<div className="grid flex-1 gap-2 sm:grid-cols-2">
											<Input
												aria-label="Question in English"
												placeholder="English"
												value={question.question}
												onChange={(e) =>
													updateQuestion(
														question.id,
														"question",
														e.target.value,
													)
												}
											/>
											<Input
												aria-label="Question in Spanish"
												placeholder="Español"
												value={question.question_es ?? ""}
												onChange={(e) =>
													updateQuestion(
														question.id,
														"question_es",
														e.target.value,
													)
												}
											/>
										</div>
									</div>
								</div>

								<Button
									variant="ghost"
									size="icon"
									onClick={() => deleteQuestion(question.id)}
									className="text-destructive hover:text-destructive"
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>

					<div className="flex gap-2">
						<Button onClick={addQuestion} variant="outline" className="flex-1">
							<Plus className="mr-2 h-4 w-4" />
							Add Question
						</Button>

						<Button onClick={resetToDefault} variant="outline">
							Reset to Default
						</Button>
					</div>

					<Button
						onClick={handleSave}
						disabled={isSaving || !hasChanges}
						className="w-full"
					>
						{isSaving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<Save className="mr-2 h-4 w-4" />
								Save Starter Questions
							</>
						)}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Preview</CardTitle>
					<CardDescription>
						How your starter questions will appear to users
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{questions.map((q) => (
							<div
								key={q.id}
								className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
							>
								{q.emoji && <span className="text-xl">{q.emoji}</span>}
								<span className="text-sm">
									{q.question || "(Empty question)"}
								</span>
							</div>
						))}
						{questions.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-4">
								No starter questions yet. Add some above!
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Tips</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-muted-foreground">
					<p>
						• <strong>Be specific:</strong> Ask clear questions that showcase
						your bot's knowledge
					</p>
					<p>
						• <strong>Use both languages:</strong> Include questions in English
						and Spanish
					</p>
					<p>
						• <strong>Cover key topics:</strong> Services, pricing, booking,
						testimonials
					</p>
					<p>
						• <strong>Add emojis:</strong> Make questions visually appealing and
						easy to scan
					</p>
					<p>
						• <strong>Keep it short:</strong> 3-5 questions work best to avoid
						overwhelming users
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
