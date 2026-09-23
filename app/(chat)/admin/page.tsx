import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin-tabs";
import { getAuthUser } from "@/lib/auth";

export default async function AdminPage() {
	const user = await getAuthUser();

	if (!user) {
		redirect("/sign-in");
	}

	// Single-tenant: Only the owner can access admin
	// Add your email here or use an environment variable
	const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "your-email@example.com";

	if (user.email !== ADMIN_EMAIL) {
		redirect("/");
	}

	/**
	 * Which business this dashboard is editing, and whether that is the one this
	 * deployment's public widget actually serves.
	 *
	 * Every tab below writes rows scoped to the SIGNED-IN user's business, while
	 * the public widget answers from DEFAULT_BUSINESS_ID. Those are two different
	 * things and the page never said so. On 2026-09-23 the owner signed in, landed
	 * in a business holding zero knowledge chunks and no bot settings, saw empty
	 * stats plus a hardcoded placeholder naming an unrelated company, and
	 * reasonably concluded the product was dead. It was not — he was editing a
	 * different tenant, and nothing on screen could have told him.
	 */
	const servingBusinessId = process.env.DEFAULT_BUSINESS_ID?.trim();
	const editingTheServedBusiness =
		Boolean(servingBusinessId) && servingBusinessId === user.businessId;

	return (
		<div className="flex flex-col min-h-screen">
			<div className="flex-1 overflow-y-auto">
				<div className="max-w-6xl mx-auto p-6">
					<div className="mb-8">
						<h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
						<p className="text-muted-foreground">
							Manage your AI chatbot's knowledge base and settings
						</p>
						<div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
							<span className="rounded-md border bg-muted px-2.5 py-1 font-medium">
								{user.businessName}
							</span>
							<span className="text-muted-foreground">{user.email}</span>
							<span className="text-muted-foreground">·</span>
							<span className="text-muted-foreground capitalize">
								{user.role}
							</span>
						</div>
						{servingBusinessId && !editingTheServedBusiness && (
							<div
								role="alert"
								className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
							>
								<p className="font-semibold">
									You are not editing the assistant on this site.
								</p>
								<p className="mt-1">
									The public chat widget on this deployment is served by a
									different business. Everything you change here applies to{" "}
									<strong>{user.businessName}</strong> only, and will not affect
									that widget.
								</p>
							</div>
						)}
					</div>
					<AdminTabs />
				</div>
			</div>
		</div>
	);
}
