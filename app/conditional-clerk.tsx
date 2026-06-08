"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps the app in ClerkProvider EXCEPT on the public embed widget routes.
 *
 * The embed (`/embed/*`) renders in a cross-origin iframe on customer sites.
 * ClerkProvider on a dev instance injects a hidden accounts.dev iframe and runs
 * a dev-browser handshake — both are blocked by the host site's CSP and break
 * the widget. The embed needs no auth, so we skip Clerk there entirely.
 */
export function ConditionalClerkProvider({
	children,
	// biome-ignore lint/suspicious/noExplicitAny: Clerk's localization resource type
	localization,
}: {
	children: ReactNode;
	localization: any;
}) {
	const pathname = usePathname();

	if (pathname?.startsWith("/embed")) {
		return <>{children}</>;
	}

	return <ClerkProvider localization={localization}>{children}</ClerkProvider>;
}
