import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { AdminTabs } from "@/components/admin-tabs";

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

	return (
		<div className="flex flex-col min-h-screen">
			<div className="flex-1 overflow-y-auto">
				<div className="max-w-6xl mx-auto p-6">
					<div className="mb-8">
						<h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
						<p className="text-muted-foreground">
							Manage your AI chatbot's knowledge base and settings
						</p>
					</div>
					<AdminTabs />
				</div>
			</div>
		</div>
	);
}
