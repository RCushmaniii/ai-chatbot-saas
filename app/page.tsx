import { redirect } from "next/navigation";
import { ConversoLandingPage } from "@/components/converso-landing";
import { getAuthUser } from "@/lib/auth";

export default async function RootPage() {
	const user = await getAuthUser();

	// Authenticated users: check onboarding status first
	if (user) {
		if (user.onboardingStatus === "pending") {
			redirect("/onboarding");
		}
		redirect("/chat");
	}

	// Unauthenticated users see the landing page
	return <ConversoLandingPage />;
}
