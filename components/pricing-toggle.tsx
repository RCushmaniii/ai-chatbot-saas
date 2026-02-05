"use client";

import { cn } from "@/lib/utils";

interface PricingToggleProps {
	billingCycle: "monthly" | "annual";
	onChange: (cycle: "monthly" | "annual") => void;
}

export function PricingToggle({ billingCycle, onChange }: PricingToggleProps) {
	return (
		<div className="flex items-center justify-center gap-4">
			<button
				type="button"
				onClick={() => onChange("monthly")}
				className={cn(
					"px-4 py-2 text-sm font-medium rounded-lg transition-colors",
					billingCycle === "monthly"
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground hover:bg-muted/80"
				)}
			>
				Monthly
			</button>
			<button
				type="button"
				onClick={() => onChange("annual")}
				className={cn(
					"px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
					billingCycle === "annual"
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground hover:bg-muted/80"
				)}
			>
				Annual
				<span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
					Save 20%
				</span>
			</button>
		</div>
	);
}
