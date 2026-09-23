"use client";

import { UserButton } from "@clerk/nextjs";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * The console's persistent identity bar.
 *
 * Ported from cushlabs-messenger-bot/admin, which has had one since it was
 * built. Before this, /admin rendered a bare "Admin Dashboard" heading with no
 * header at all: nothing named the product, nothing showed whether you were
 * signed in, nothing said as whom, and nothing said which account's data every
 * tab below was reading and writing.
 *
 * On 2026-09-23 that cost a full day. The owner signed in, landed in a business
 * that had been auto-created for him seconds earlier by getAuthUser(), saw empty
 * stats and a form field pre-filled with an unrelated company's domain, and
 * concluded the product was dead. Every fact that would have corrected him in
 * five seconds — his email, his business, whether it serves the live widget —
 * was already in memory and simply never rendered.
 *
 * Sticky, because the answer to "whose account am I changing?" must still be on
 * screen after scrolling down a long Knowledge tab.
 */
export function AdminConsoleHeader({
	businessName,
	email,
	role,
}: {
	businessName: string;
	email: string;
	role: string;
}) {
	return (
		<header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-sm">
			<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<span className="shrink-0 font-semibold tracking-tight">
						Converso
					</span>
					<span aria-hidden className="text-muted-foreground">
						/
					</span>
					<span className="truncate text-sm font-medium" title={businessName}>
						{businessName}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<span
						className="hidden truncate text-sm text-muted-foreground sm:inline"
						title={email}
					>
						{email}
					</span>
					<span className="rounded-md border px-2 py-0.5 text-xs capitalize text-muted-foreground">
						{role}
					</span>
					<ThemeToggle />
					<UserButton
						appearance={{ elements: { userButtonAvatarBox: "h-7 w-7" } }}
					/>
				</div>
			</div>
		</header>
	);
}

/**
 * Rendered only after mount. next-themes cannot know the resolved theme during
 * SSR, so labelling the button before hydration produces a server/client
 * mismatch and an icon that flips on load. A fixed-size placeholder keeps the
 * header from reflowing.
 */
function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	if (!mounted) return <div className="h-8 w-8" aria-hidden />;

	const next = resolvedTheme === "dark" ? "light" : "dark";

	return (
		<Button
			variant="ghost"
			size="icon"
			className="h-8 w-8"
			onClick={() => setTheme(next)}
			aria-label={`Switch to ${next} mode`}
			title={`Switch to ${next} mode`}
		>
			{resolvedTheme === "dark" ? (
				<Sun className="h-4 w-4" />
			) : (
				<Moon className="h-4 w-4" />
			)}
		</Button>
	);
}
