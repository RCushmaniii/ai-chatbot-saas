import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { AdminAccountContext } from "@/components/admin-account-context";
import { AdminConsoleHeader } from "@/components/admin-console-header";
import { AdminTabs } from "@/components/admin-tabs";
import { getAuthUser, getUserBusinesses } from "@/lib/auth";

/**
 * The business this deployment's public widget answers from.
 *
 * .trim() is load-bearing: env values set via some CLIs carry a trailing
 * newline, and an untrimmed UUID makes Postgres throw 22P02 elsewhere in the
 * codebase. Kept consistent with app/api/embed/chat/route.ts.
 */
const servingBusinessId = process.env.DEFAULT_BUSINESS_ID?.trim() || undefined;

export default async function AdminPage() {
	const user = await getAuthUser();

	if (!user) {
		redirect("/sign-in");
	}

	// Single-tenant: Only the owner can access admin
	// Add your email here or use an environment variable
	const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "your-email@example.com";

	/**
	 * A refused operator is TOLD they were refused, and with which identity.
	 *
	 * This used to be redirect("/") — a signed-in person with the wrong email
	 * was bounced to the home page with no message at all, which is
	 * indistinguishable from the console being broken. Borrowed from
	 * cushlabs-messenger-bot/admin, whose 403 screen prints the email its auth
	 * layer actually saw; that single line is what turns "this product is dead"
	 * into "I am signed in as the wrong account" in about five seconds.
	 *
	 * Showing the viewer their own email back is not a disclosure — they are
	 * already authenticated as it, and Clerk's own account menu displays it.
	 */
	if (user.email !== ADMIN_EMAIL) {
		return (
			<NotAuthorized email={user.email} businessName={user.businessName} />
		);
	}

	const businesses = await getUserBusinesses(user.id);

	return (
		<div className="flex min-h-screen flex-col">
			<AdminConsoleHeader
				businessName={user.businessName}
				email={user.email}
				role={user.role}
			/>
			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto max-w-6xl p-6">
					<div className="mb-8">
						<h1 className="mb-2 font-bold text-3xl">Admin Dashboard</h1>
						<p className="text-muted-foreground">
							Manage your AI chatbot&apos;s knowledge base and settings
						</p>
					</div>

					<AdminAccountContext
						businessName={user.businessName}
						businessId={user.businessId}
						servingBusinessId={servingBusinessId}
						businesses={businesses}
					/>

					<AdminTabs />
				</div>
			</div>
		</div>
	);
}

function NotAuthorized({
	email,
	businessName,
}: {
	email: string;
	businessName: string;
}) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
			<div className="mb-2 font-semibold text-amber-600 text-sm uppercase tracking-[0.2em] dark:text-amber-400">
				403
			</div>
			<h1 className="mb-3 font-bold text-2xl">Not authorized</h1>
			<p className="max-w-md text-muted-foreground text-sm">
				This account is not on the operator allowlist for this deployment. Sign
				out and try again with the correct account.
			</p>
			<div className="mt-6 space-y-1 text-sm">
				<p className="text-muted-foreground">
					Signed in as <code className="text-foreground">{email}</code>
				</p>
				<p className="text-muted-foreground">
					Account <code className="text-foreground">{businessName}</code>
				</p>
			</div>
			<div className="mt-8">
				<UserButton />
			</div>
		</div>
	);
}
