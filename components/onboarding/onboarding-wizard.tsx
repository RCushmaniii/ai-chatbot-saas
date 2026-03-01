"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { translations } from "@/lib/i18n/translations";
import { OnboardingStepper } from "./onboarding-stepper";
import { StepEmbedCode } from "./step-embed-code";
import { StepKnowledge } from "./step-knowledge";
import { StepTestChat } from "./step-test-chat";
import { StepWelcome } from "./step-welcome";

interface OnboardingWizardProps {
	initialStep: number;
	locale: "en" | "es";
	businessId: string;
	businessName: string;
	botName: string;
	botId: string;
}

export function OnboardingWizard({
	initialStep,
	locale,
	businessId,
	businessName: initialBusinessName,
	botName: initialBotName,
	botId,
}: OnboardingWizardProps) {
	const router = useRouter();
	const t = translations[locale].onboarding;

	const [currentStep, setCurrentStep] = useState(initialStep);
	const [businessName, setBusinessName] = useState(initialBusinessName);
	const [botName, setBotName] = useState(initialBotName);
	const [hasKnowledge, setHasKnowledge] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	const stepLabels = [t.step1Label, t.step2Label, t.step3Label, t.step4Label];

	const saveProgress = useCallback(
		async (
			step: number,
			extra?: { businessName?: string; botName?: string },
		) => {
			setIsSaving(true);
			try {
				await fetch("/api/onboarding/progress", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ step, ...extra }),
				});
			} catch {
				// Non-blocking — progress save failure shouldn't halt onboarding
			} finally {
				setIsSaving(false);
			}
		},
		[],
	);

	const handleNext = async () => {
		if (currentStep === 1) {
			// Save business/bot names with step 2 transition
			await saveProgress(2, {
				businessName: businessName.trim() || undefined,
				botName: botName.trim() || undefined,
			});
			setCurrentStep(2);
		} else if (currentStep < 4) {
			const nextStep = currentStep + 1;
			await saveProgress(nextStep);
			setCurrentStep(nextStep);
		}
	};

	const handleBack = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleComplete = async (status: "completed" | "skipped") => {
		setIsSaving(true);
		try {
			await fetch("/api/onboarding/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status }),
			});
			router.push(status === "completed" ? "/admin" : "/chat");
			router.refresh();
		} catch {
			// If complete fails, still try to navigate
			router.push("/chat");
			router.refresh();
		} finally {
			setIsSaving(false);
		}
	};

	const handleKnowledgeAdded = () => {
		setHasKnowledge(true);
	};

	return (
		<div className="space-y-6">
			<OnboardingStepper currentStep={currentStep} labels={stepLabels} />

			{/* Step content */}
			{currentStep === 1 && (
				<StepWelcome
					businessName={businessName}
					botName={botName}
					onBusinessNameChange={setBusinessName}
					onBotNameChange={setBotName}
					t={t}
				/>
			)}
			{currentStep === 2 && (
				<StepKnowledge onKnowledgeAdded={handleKnowledgeAdded} t={t} />
			)}
			{currentStep === 3 && (
				<StepTestChat botId={botId} hasKnowledge={hasKnowledge} t={t} />
			)}
			{currentStep === 4 && <StepEmbedCode botId={botId} t={t} />}

			{/* Navigation */}
			<div className="flex items-center justify-between pt-2">
				<div>
					{currentStep > 1 ? (
						<Button variant="ghost" onClick={handleBack} disabled={isSaving}>
							{t.back}
						</Button>
					) : (
						<Button
							variant="ghost"
							onClick={() => handleComplete("skipped")}
							disabled={isSaving}
							className="text-muted-foreground"
						>
							{t.skip}
						</Button>
					)}
				</div>

				<div className="flex gap-2">
					{currentStep === 2 && (
						<Button
							variant="ghost"
							onClick={handleNext}
							disabled={isSaving}
							className="text-muted-foreground"
						>
							{t.skipKnowledge}
						</Button>
					)}

					{currentStep < 4 ? (
						<Button onClick={handleNext} disabled={isSaving}>
							{t.next}
						</Button>
					) : (
						<Button
							onClick={() => handleComplete("completed")}
							disabled={isSaving}
						>
							{t.finish}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
