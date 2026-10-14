"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

/**
 * The install code an owner pastes into their site.
 *
 * It carries NO appearance or text attributes, on purpose. Attributes on the
 * script tag used to be the only way to style the widget, so this card baked
 * ten of them into the code (color, welcome text, position…). Once pasted,
 * those copies sat on the customer's site where the admin could not reach
 * them: on ny-ai-chatbot a hard-coded data-button-color made every color the
 * owner saved look like a broken save (2026-10-12). Appearance now lives in
 * the admin (components/admin-widget-appearance.tsx) and reaches visitors
 * through /api/embed/settings; tests/unit/embed-install-attributes.test.ts
 * fails if appearance attributes come back here or on a demo page.
 *
 * Language is not set either: the widget follows the page's <html lang> and
 * switches when the page does. data-language is documented for pages whose
 * lang attribute is wrong.
 */
export function buildInstallCode(origin: string): string {
	return `<script async src="${origin}/api/embed"></script>`;
}

export function AdminEmbedCode() {
	const [copied, setCopied] = useState(false);
	const [origin, setOrigin] = useState("");
	useEffect(() => setOrigin(window.location.origin), []);
	const code = buildInstallCode(origin);

	const copy = async () => {
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Install code</CardTitle>
				<CardDescription>
					Paste this once into your website, just before the closing body tag.
					Changes you save above reach your site without touching this code
					again.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="relative">
					<pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 pr-24 text-sm text-gray-100">
						<code>{code}</code>
					</pre>
					<Button
						size="sm"
						variant="secondary"
						className="absolute top-2 right-2"
						onClick={copy}
						disabled={!origin}
					>
						{copied ? (
							<>
								<Check className="mr-2 h-4 w-4" />
								Copied
							</>
						) : (
							<>
								<Copy className="mr-2 h-4 w-4" />
								Copy
							</>
						)}
					</Button>
				</div>
				<p className="text-sm text-muted-foreground">
					The chat speaks the language of the page it is on. If your Spanish
					pages are not marked as Spanish, add{" "}
					<code className="rounded bg-muted px-1">data-language="es"</code> to
					the code on those pages.
				</p>
			</CardContent>
		</Card>
	);
}
