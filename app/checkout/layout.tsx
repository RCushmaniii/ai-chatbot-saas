import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
	const cookieStore = await cookies();
	const lang = cookieStore.get("converso-lang")?.value === "en" ? "en" : "es";
	const isEn = lang === "en";

	return {
		title: isEn ? "Checkout" : "Pago",
		description: isEn
			? "Complete your Converso subscription."
			: "Completa tu suscripción a Converso.",
		robots: { index: false, follow: false },
	};
}

export default function CheckoutLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
