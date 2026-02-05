"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PricingCard } from "@/components/pricing-card";
import { PricingToggle } from "@/components/pricing-toggle";
import type { Plan } from "@/lib/db/schema";

export default function PricingPage() {
	const router = useRouter();
	const [plans, setPlans] = useState<Plan[]>([]);
	const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
	const [isLoading, setIsLoading] = useState(true);
	const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

	useEffect(() => {
		async function fetchPlans() {
			try {
				const response = await fetch("/api/plans");
				if (response.ok) {
					const data = await response.json();
					setPlans(data);
				}
			} catch (error) {
				console.error("Failed to fetch plans:", error);
			} finally {
				setIsLoading(false);
			}
		}

		fetchPlans();
	}, []);

	const handleSelectPlan = async (planId: string, cycle: "monthly" | "annual") => {
		const plan = plans.find((p) => p.id === planId);

		// If it's the free plan, redirect to sign up
		if (plan?.priceMonthly === 0) {
			router.push("/sign-up");
			return;
		}

		setSelectedPlanId(planId);

		try {
			const response = await fetch("/api/stripe/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ planId, billingCycle: cycle }),
			});

			const data = await response.json();

			if (data.url) {
				window.location.href = data.url;
			} else if (data.error) {
				// If unauthorized, redirect to sign in
				if (response.status === 401) {
					router.push(`/sign-in?redirect=/pricing`);
				} else {
					console.error("Checkout error:", data.error);
					alert(data.error);
				}
			}
		} catch (error) {
			console.error("Failed to create checkout session:", error);
		} finally {
			setSelectedPlanId(null);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-pulse text-muted-foreground">
					Loading plans...
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-6xl mx-auto px-4 py-16">
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold mb-4">
						Simple, Transparent Pricing
					</h1>
					<p className="text-xl text-muted-foreground mb-8">
						Choose the plan that fits your needs. Upgrade or downgrade anytime.
					</p>
					<PricingToggle
						billingCycle={billingCycle}
						onChange={setBillingCycle}
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
					{plans.map((plan) => (
						<PricingCard
							key={plan.id}
							plan={plan}
							billingCycle={billingCycle}
							onSelect={handleSelectPlan}
							isLoading={selectedPlanId === plan.id}
						/>
					))}
				</div>

				<div className="mt-16 text-center">
					<h2 className="text-2xl font-semibold mb-4">
						Frequently Asked Questions
					</h2>
					<div className="max-w-2xl mx-auto space-y-6 text-left">
						<div>
							<h3 className="font-medium mb-2">
								Can I change my plan later?
							</h3>
							<p className="text-muted-foreground">
								Yes, you can upgrade or downgrade your plan at any time. Changes
								take effect immediately, and we'll prorate any charges.
							</p>
						</div>
						<div>
							<h3 className="font-medium mb-2">
								What happens if I exceed my limits?
							</h3>
							<p className="text-muted-foreground">
								We'll notify you when you're approaching your limits. Your
								chatbot will continue working, but you may want to upgrade to
								avoid any service interruptions.
							</p>
						</div>
						<div>
							<h3 className="font-medium mb-2">
								Do you offer refunds?
							</h3>
							<p className="text-muted-foreground">
								Yes, we offer a 14-day money-back guarantee. If you're not
								satisfied, contact us for a full refund.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
