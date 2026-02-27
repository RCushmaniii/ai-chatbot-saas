"use client";

import { AlertCircle, MessageSquare } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { OnboardingStrings } from "./types";

interface StepTestChatProps {
	botId: string;
	hasKnowledge: boolean;
	t: OnboardingStrings;
}

export function StepTestChat({ botId, hasKnowledge, t }: StepTestChatProps) {
	const embedUrl = `/embed/chat?botId=${botId}`;

	return (
		<Card>
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">{t.testTitle}</CardTitle>
				<CardDescription className="text-base">
					{t.testSubtitle}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!hasKnowledge && (
					<div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
						<AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
						<p>{t.testNoKnowledge}</p>
					</div>
				)}

				{/* Phone mockup frame */}
				<div className="mx-auto max-w-sm">
					<div className="rounded-2xl border-4 border-foreground/10 bg-background overflow-hidden shadow-lg">
						{/* Phone status bar mockup */}
						<div className="bg-muted px-4 py-2 flex items-center justify-center gap-2">
							<MessageSquare className="w-4 h-4 text-primary" />
							<span className="text-xs font-medium text-muted-foreground">
								Chat Preview
							</span>
						</div>
						{/* Chat iframe */}
						<iframe
							src={embedUrl}
							title="Chat Preview"
							className="w-full border-0"
							style={{ height: "450px" }}
						/>
					</div>
				</div>

				{hasKnowledge && (
					<p className="text-center text-sm text-muted-foreground italic">
						{t.testTip}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
