"use client";

import { CreditCard, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface BillingInfo {
	plan: {
		name: string;
		displayName: string;
		messagesPerMonth: number;
		knowledgeBasePagesLimit: number;
	} | null;
	subscription: {
		status: string;
		billingCycle: string;
		currentPeriodEnd: string | null;
		stripeCustomerId: string | null;
	} | null;
	usage: {
		messagesUsed: number;
		pagesUsed: number;
	};
}

export function BillingSection() {
	const router = useRouter();
	const [billing, setBilling] = useState<BillingInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isPortalLoading, setIsPortalLoading] = useState(false);

	useEffect(() => {
		async function fetchBilling() {
			try {
				const response = await fetch("/api/admin/billing");
				if (response.ok) {
					const data = await response.json();
					setBilling(data);
				}
			} catch (error) {
				console.error("Failed to fetch billing:", error);
			} finally {
				setIsLoading(false);
			}
		}

		fetchBilling();
	}, []);

	const handleManageBilling = async () => {
		setIsPortalLoading(true);
		try {
			const response = await fetch("/api/stripe/portal", {
				method: "POST",
			});
			const data = await response.json();

			if (data.url) {
				window.location.href = data.url;
			} else {
				console.error("Portal error:", data.error);
			}
		} catch (error) {
			console.error("Failed to open billing portal:", error);
		} finally {
			setIsPortalLoading(false);
		}
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="animate-pulse space-y-4">
						<div className="h-4 bg-muted rounded w-1/4" />
						<div className="h-8 bg-muted rounded w-1/2" />
					</div>
				</CardContent>
			</Card>
		);
	}

	const plan = billing?.plan;
	const subscription = billing?.subscription;
	const usage = billing?.usage || { messagesUsed: 0, pagesUsed: 0 };

	const messagesPercent = plan
		? Math.min((usage.messagesUsed / plan.messagesPerMonth) * 100, 100)
		: 0;
	const pagesPercent = plan
		? Math.min((usage.pagesUsed / plan.knowledgeBasePagesLimit) * 100, 100)
		: 0;

	const statusColors: Record<string, string> = {
		active: "bg-green-500",
		trialing: "bg-blue-500",
		past_due: "bg-yellow-500",
		canceled: "bg-red-500",
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<CreditCard className="h-5 w-5" />
							Billing & Usage
						</CardTitle>
						<CardDescription>
							Manage your subscription and view usage
						</CardDescription>
					</div>
					{subscription?.status && subscription.status !== "trialing" && (
						<Badge
							className={statusColors[subscription.status] || "bg-gray-500"}
						>
							{subscription.status}
						</Badge>
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-muted-foreground">Current Plan</p>
						<p className="text-2xl font-bold">{plan?.displayName || "Free"}</p>
						{subscription?.currentPeriodEnd && (
							<p className="text-sm text-muted-foreground">
								{subscription.status === "canceled" ? "Access until" : "Renews"}{" "}
								{new Date(subscription.currentPeriodEnd).toLocaleDateString()}
							</p>
						)}
					</div>
					<div className="flex gap-2">
						{subscription?.stripeCustomerId ? (
							<Button
								variant="outline"
								onClick={handleManageBilling}
								disabled={isPortalLoading}
							>
								{isPortalLoading ? "Loading..." : "Manage Billing"}
								<ExternalLink className="ml-2 h-4 w-4" />
							</Button>
						) : (
							<Button onClick={() => router.push("/pricing")}>
								Upgrade Plan
							</Button>
						)}
					</div>
				</div>

				<div className="space-y-4">
					<div>
						<div className="flex justify-between text-sm mb-2">
							<span>Messages this month</span>
							<span>
								{usage.messagesUsed.toLocaleString()} /{" "}
								{plan?.messagesPerMonth.toLocaleString() || "100"}
							</span>
						</div>
						<Progress value={messagesPercent} className="h-2" />
					</div>

					<div>
						<div className="flex justify-between text-sm mb-2">
							<span>Knowledge base pages</span>
							<span>
								{usage.pagesUsed.toLocaleString()} /{" "}
								{plan?.knowledgeBasePagesLimit.toLocaleString() || "10"}
							</span>
						</div>
						<Progress value={pagesPercent} className="h-2" />
					</div>
				</div>

				{(!plan || plan.name === "free") && (
					<div className="bg-muted/50 rounded-lg p-4 text-center">
						<p className="text-sm text-muted-foreground mb-2">
							Upgrade to unlock more features and higher limits
						</p>
						<Button size="sm" onClick={() => router.push("/pricing")}>
							View Plans
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
