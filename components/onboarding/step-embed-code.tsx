"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { buildInstallCode } from "@/components/admin-embed-code";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { OnboardingStrings } from "./types";

interface StepEmbedCodeProps {
	botId: string;
	t: OnboardingStrings;
}

/**
 * The install code carries no appearance attributes: colors, avatar and text
 * are set in the admin's Widget tab and reach the site through
 * /api/embed/settings. A color baked into this code used to sit on the
 * customer's site out of the admin's reach (see components/admin-embed-code.tsx).
 * botId stays in the props for the wizard's sake; the deployment already knows
 * which business it serves.
 */
export function StepEmbedCode({ t }: StepEmbedCodeProps) {
	const [copied, setCopied] = useState(false);
	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const embedCode = buildInstallCode(origin);

	const copyToClipboard = () => {
		navigator.clipboard.writeText(embedCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Card>
			<CardHeader className="text-center">
				<CardTitle className="text-2xl">{t.embedTitle}</CardTitle>
				<CardDescription className="text-base">
					{t.embedSubtitle}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Code block */}
				<div className="relative">
					<pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto text-sm">
						<code>{embedCode}</code>
					</pre>
					<Button
						size="sm"
						variant="secondary"
						className="absolute top-2 right-2"
						onClick={copyToClipboard}
					>
						{copied ? (
							<>
								<Check className="w-4 h-4 mr-1" />
								{t.embedCopied}
							</>
						) : (
							<>
								<Copy className="w-4 h-4 mr-1" />
								{t.embedCopy}
							</>
						)}
					</Button>
				</div>

				{/* Instructions */}
				<div className="space-y-2">
					<h4 className="font-semibold text-sm">{t.embedInstructions}</h4>
					<ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
						<li>{t.embedStep1}</li>
						<li>{t.embedStep2}</li>
						<li>{t.embedStep3}</li>
					</ol>
				</div>
			</CardContent>
		</Card>
	);
}
