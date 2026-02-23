"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function CheckoutCancelPage() {
	const router = useRouter();

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<Card className="w-full max-w-md text-center">
				<CardHeader>
					<div className="mx-auto mb-4">
						<XCircle className="h-16 w-16 text-muted-foreground" />
					</div>
					<CardTitle className="text-2xl">Checkout Cancelled</CardTitle>
					<CardDescription>
						Your payment was not processed. No charges were made.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<p className="text-sm text-muted-foreground">
						Changed your mind? No problem. You can always come back and
						subscribe when you're ready. Your free plan features remain active.
					</p>
				</CardContent>

				<CardFooter className="flex flex-col gap-3">
					<Button className="w-full" onClick={() => router.push("/pricing")}>
						View Plans
					</Button>
					<Button
						variant="outline"
						className="w-full"
						onClick={() => router.push("/")}
					>
						Continue with Free Plan
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
