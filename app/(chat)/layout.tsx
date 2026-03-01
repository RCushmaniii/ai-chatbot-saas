import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthUser } from "@/lib/auth";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [user, cookieStore] = await Promise.all([getAuthUser(), cookies()]);

	if (user?.onboardingStatus === "pending") {
		redirect("/onboarding");
	}

	const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

	return (
		<>
			<Script
				src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
				strategy="beforeInteractive"
			/>
			<DataStreamProvider>
				<SidebarProvider defaultOpen={!isCollapsed}>
					<AppSidebar user={user} />
					<SidebarInset>{children}</SidebarInset>
				</SidebarProvider>
			</DataStreamProvider>
		</>
	);
}
