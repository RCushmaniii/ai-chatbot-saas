import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
	const cookieStore = await cookies();
	const lang = cookieStore.get("converso-lang")?.value === "en" ? "en" : "es";
	const isEn = lang === "en";

	return {
		title: isEn ? "Pricing" : "Precios",
		description: isEn
			? "Simple and transparent plans for your bilingual chatbot. Start free, scale when you need."
			: "Planes simples y transparentes para tu chatbot bilingüe. Empieza gratis, escala cuando lo necesites.",
		alternates: {
			canonical: "https://soyconverso.com/pricing",
		},
		openGraph: {
			title: isEn ? "Pricing | Converso" : "Precios | Converso",
			description: isEn
				? "Simple and transparent plans for your bilingual chatbot. Start free, scale when you need."
				: "Planes simples y transparentes para tu chatbot bilingüe. Empieza gratis, escala cuando lo necesites.",
		},
	};
}

export default function PricingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
