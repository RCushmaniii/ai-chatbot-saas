"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { PricingCard } from "@/components/pricing-card";
import { PricingToggle } from "@/components/pricing-toggle";
import type { Plan } from "@/lib/db/schema";
import { useLanguage } from "@/lib/i18n/use-language";

export default function PricingPage() {
	const router = useRouter();
	const { t } = useLanguage();
	const [plans, setPlans] = useState<Plan[]>([]);
	const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
		"monthly",
	);
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

	const handleSelectPlan = async (
		planId: string,
		cycle: "monthly" | "annual",
	) => {
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
					router.push("/sign-in?redirect=/pricing");
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
			<div className="min-h-screen bg-background">
				<Navbar />
				<div className="pt-[72px] flex items-center justify-center min-h-[calc(100vh-72px)]">
					<div className="animate-pulse text-muted-foreground">
						{t.pricing.loading}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<Navbar />
			<div className="pt-[72px]">
				<div className="max-w-6xl mx-auto px-4 py-16">
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold mb-4">{t.pricing.title}</h1>
						<p className="text-xl text-muted-foreground mb-8">
							{t.pricing.subtitle}
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
						<h2 className="text-2xl font-semibold mb-4">{t.faq.title}</h2>
						<div className="max-w-2xl mx-auto space-y-6 text-left">
							{t.pricing.faq.map((item) => (
								<div key={item.q}>
									<h3 className="font-medium mb-2">{item.q}</h3>
									<p className="text-muted-foreground">{item.a}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
			<Footer />
		</div>
	);
}
