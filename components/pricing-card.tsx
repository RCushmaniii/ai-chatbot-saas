"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/db/schema";

interface PricingCardProps {
	plan: Plan;
	billingCycle: "monthly" | "annual";
	isCurrentPlan?: boolean;
	onSelect: (planId: string, billingCycle: "monthly" | "annual") => void;
	isLoading?: boolean;
}

export function PricingCard({
	plan,
	billingCycle,
	isCurrentPlan = false,
	onSelect,
	isLoading = false,
}: PricingCardProps) {
	const price =
		billingCycle === "annual"
			? Math.round(plan.priceAnnual / 12 / 100)
			: Math.round(plan.priceMonthly / 100);

	const isPopular = plan.name === "pro";
	const isFree = plan.priceMonthly === 0;

	return (
		<Card
			className={cn(
				"relative flex flex-col",
				isPopular && "border-primary shadow-lg scale-105"
			)}
		>
			{isPopular && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2">
					<Badge className="bg-primary text-primary-foreground">
						Most Popular
					</Badge>
				</div>
			)}

			<CardHeader className="text-center pb-2">
				<CardTitle className="text-xl">{plan.displayName}</CardTitle>
				<CardDescription>{plan.description}</CardDescription>
			</CardHeader>

			<CardContent className="flex-1">
				<div className="text-center mb-6">
					<span className="text-4xl font-bold">${price}</span>
					<span className="text-muted-foreground">/month</span>
					{billingCycle === "annual" && !isFree && (
						<p className="text-sm text-muted-foreground mt-1">
							Billed ${Math.round(plan.priceAnnual / 100)} annually
						</p>
					)}
				</div>

				<div className="space-y-3">
					<div className="text-sm font-medium text-muted-foreground mb-2">
						Includes:
					</div>
					<ul className="space-y-2">
						<li className="flex items-center gap-2 text-sm">
							<Check className="h-4 w-4 text-green-500 shrink-0" />
							<span>
								{plan.messagesPerMonth.toLocaleString()} messages/month
							</span>
						</li>
						<li className="flex items-center gap-2 text-sm">
							<Check className="h-4 w-4 text-green-500 shrink-0" />
							<span>
								{plan.knowledgeBasePagesLimit.toLocaleString()} knowledge base
								pages
							</span>
						</li>
						<li className="flex items-center gap-2 text-sm">
							<Check className="h-4 w-4 text-green-500 shrink-0" />
							<span>
								{plan.chatbotsLimit === -1
									? "Unlimited"
									: plan.chatbotsLimit}{" "}
								chatbot{plan.chatbotsLimit !== 1 ? "s" : ""}
							</span>
						</li>
						<li className="flex items-center gap-2 text-sm">
							<Check className="h-4 w-4 text-green-500 shrink-0" />
							<span>
								{plan.teamMembersLimit === -1
									? "Unlimited"
									: plan.teamMembersLimit}{" "}
								team member{plan.teamMembersLimit !== 1 ? "s" : ""}
							</span>
						</li>
						{plan.features?.map((feature, index) => (
							<li key={index} className="flex items-center gap-2 text-sm">
								<Check className="h-4 w-4 text-green-500 shrink-0" />
								<span>{feature}</span>
							</li>
						))}
					</ul>
				</div>
			</CardContent>

			<CardFooter>
				<Button
					className="w-full"
					variant={isPopular ? "default" : "outline"}
					disabled={isCurrentPlan || isLoading}
					onClick={() => onSelect(plan.id, billingCycle)}
				>
					{isLoading
						? "Loading..."
						: isCurrentPlan
							? "Current Plan"
							: isFree
								? "Get Started"
								: "Subscribe"}
				</Button>
			</CardFooter>
		</Card>
	);
}
