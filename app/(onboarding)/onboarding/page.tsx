import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

/**
 * Detect locale from the browser's Accept-Language header.
 * Falls back to the user's DB locale.
 */
function detectLocale(acceptLanguage: string | null, dbLocale: string): "en" | "es" {
	if (acceptLanguage) {
		if (acceptLanguage.startsWith("es")) return "es";
		if (acceptLanguage.startsWith("en")) return "en";
	}
	return dbLocale === "es" ? "es" : "en";
}

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

	const headerStore = await headers();
	const acceptLanguage = headerStore.get("accept-language");
	const locale = detectLocale(acceptLanguage, user.locale);

	return (
		<OnboardingWizard
			initialStep={user.onboardingStep}
			locale={locale}
			businessId={user.businessId}
			businessName={user.businessName}
			botName="Mi Chatbot"
			botId={user.botId}
		/>
	);
}
