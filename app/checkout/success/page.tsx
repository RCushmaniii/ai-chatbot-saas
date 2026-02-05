"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

function CheckoutSuccessContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [isVerifying, setIsVerifying] = useState(true);
	const sessionId = searchParams.get("session_id");

	useEffect(() => {
		// Give webhook a moment to process
		const timer = setTimeout(() => {
			setIsVerifying(false);
		}, 2000);

		return () => clearTimeout(timer);
	}, [sessionId]);

	if (isVerifying) {
		return (
			<Card className="w-full max-w-md text-center">
				<CardHeader>
					<div className="mx-auto mb-4">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
					</div>
					<CardTitle>Processing Your Payment</CardTitle>
					<CardDescription>
						Please wait while we confirm your subscription...
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-md text-center">
			<CardHeader>
				<div className="mx-auto mb-4">
					<CheckCircle className="h-16 w-16 text-green-500" />
				</div>
				<CardTitle className="text-2xl">Payment Successful!</CardTitle>
				<CardDescription>
					Thank you for subscribing. Your account has been upgraded.
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-4">
				<p className="text-sm text-muted-foreground">
					You now have access to all the features included in your plan.
					A confirmation email has been sent to your inbox.
				</p>
			</CardContent>

			<CardFooter className="flex flex-col gap-3">
				<Button
					className="w-full"
					onClick={() => router.push("/admin")}
				>
					Go to Dashboard
				</Button>
				<Button
					variant="outline"
					className="w-full"
					onClick={() => router.push("/")}
				>
					Start Chatting
				</Button>
			</CardFooter>
		</Card>
	);
}

function LoadingCard() {
	return (
		<Card className="w-full max-w-md text-center">
			<CardHeader>
				<div className="mx-auto mb-4">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
				</div>
				<CardTitle>Loading...</CardTitle>
			</CardHeader>
		</Card>
	);
}

export default function CheckoutSuccessPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<Suspense fallback={<LoadingCard />}>
				<CheckoutSuccessContent />
			</Suspense>
		</div>
	);
}
