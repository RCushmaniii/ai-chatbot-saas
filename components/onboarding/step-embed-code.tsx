"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { OnboardingStrings } from "./types";

interface StepEmbedCodeProps {
	botId: string;
	t: OnboardingStrings;
}

export function StepEmbedCode({ botId, t }: StepEmbedCodeProps) {
	const [copied, setCopied] = useState(false);
	const [buttonColor, setButtonColor] = useState("#1c4992");
	const [position, setPosition] = useState("bottom-right");

	const origin =
		typeof window !== "undefined" ? window.location.origin : "";

	const embedCode = `<script
  async
  src="${origin}/api/embed"
  id="${botId}"
  buttonColor="${buttonColor}"
  position="${position}"
></script>`;

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
				{/* Settings */}
				<div className="grid gap-4 sm:grid-cols-2 max-w-md mx-auto">
					<div className="space-y-2">
						<Label htmlFor="embedColor">{t.embedButtonColor}</Label>
						<div className="flex gap-2">
							<Input
								id="embedColor"
								type="color"
								value={buttonColor}
								onChange={(e) => setButtonColor(e.target.value)}
								className="w-12 h-10 p-1 cursor-pointer"
							/>
							<Input
								type="text"
								value={buttonColor}
								onChange={(e) => setButtonColor(e.target.value)}
								className="flex-1"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label>{t.embedPosition}</Label>
						<Select value={position} onValueChange={setPosition}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="bottom-right">
									{t.embedPositionRight}
								</SelectItem>
								<SelectItem value="bottom-left">
									{t.embedPositionLeft}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

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
