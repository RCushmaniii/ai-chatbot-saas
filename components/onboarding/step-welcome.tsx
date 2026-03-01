"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingStrings } from "./types";

interface StepWelcomeProps {
	businessName: string;
	botName: string;
	onBusinessNameChange: (name: string) => void;
	onBotNameChange: (name: string) => void;
	t: OnboardingStrings;
}

export function StepWelcome({
	businessName,
	botName,
	onBusinessNameChange,
	onBotNameChange,
	t,
}: StepWelcomeProps) {
	return (
		<Card>
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">{t.welcomeTitle}</CardTitle>
				<CardDescription className="text-base">
					{t.welcomeSubtitle}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6 max-w-md mx-auto">
				<div className="space-y-2">
					<Label htmlFor="businessName">{t.businessNameLabel}</Label>
					<Input
						id="businessName"
						value={businessName}
						onChange={(e) => onBusinessNameChange(e.target.value)}
						placeholder={t.businessNamePlaceholder}
						autoFocus
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="botName">{t.botNameLabel}</Label>
					<Input
						id="botName"
						value={botName}
						onChange={(e) => onBotNameChange(e.target.value)}
						placeholder={t.botNamePlaceholder}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
