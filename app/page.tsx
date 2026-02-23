import { redirect } from "next/navigation";
import { ConversoLandingPage } from "@/components/converso-landing";
import { getAuthUser } from "@/lib/auth";

export default async function RootPage() {
	const user = await getAuthUser();

	// Authenticated users go directly to the chat dashboard
	if (user) {
		redirect("/chat");
	}

	// Unauthenticated users see the landing page
	return <ConversoLandingPage />;
}
