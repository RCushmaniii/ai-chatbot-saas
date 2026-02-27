import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
	const user = await getAuthUser();

	if (!user) {
		redirect("/sign-in");
	}

	if (
		user.onboardingStatus === "completed" ||
		user.onboardingStatus === "skipped"
	) {
		redirect("/chat");
	}

	return (
		<OnboardingWizard
			initialStep={user.onboardingStep}
			locale={user.locale as "en" | "es"}
			businessId={user.businessId}
			businessName={user.businessName}
			botName="Mi Chatbot"
			botId={user.botId}
		/>
	);
}
