"use client";

import { Check } from "lucide-react";

interface OnboardingStepperProps {
	currentStep: number;
	labels: string[];
}

export function OnboardingStepper({
	currentStep,
	labels,
}: OnboardingStepperProps) {
	return (
		<nav aria-label="Onboarding progress" className="mb-8">
			<ol className="flex items-center justify-between">
				{labels.map((label, index) => {
					const stepNum = index + 1;
					const isCompleted = stepNum < currentStep;
					const isActive = stepNum === currentStep;

					return (
						<li key={label} className="flex items-center flex-1 last:flex-0">
							<div className="flex flex-col items-center gap-1.5">
								<div
									className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
										isCompleted
											? "bg-primary text-primary-foreground"
											: isActive
												? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
												: "bg-muted text-muted-foreground"
									}`}
								>
									{isCompleted ? <Check className="w-4 h-4" /> : stepNum}
								</div>
								<span
									className={`text-xs hidden sm:block ${
										isActive
											? "font-semibold text-foreground"
											: "text-muted-foreground"
									}`}
								>
									{label}
								</span>
							</div>
							{/* Connecting line */}
							{index < labels.length - 1 && (
								<div
									className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] sm:mt-0 ${
										isCompleted ? "bg-primary" : "bg-muted"
									}`}
								/>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
