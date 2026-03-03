import type { Metadata } from "next";
import { cookies } from "next/headers";

export async function generateMetadata(): Promise<Metadata> {
	const cookieStore = await cookies();
	const lang = cookieStore.get("converso-lang")?.value === "en" ? "en" : "es";
	const isEn = lang === "en";

	return {
		title: "Demo",
		description: isEn
			? "Try Converso's bilingual chatbot live. See how AI serves your customers in English and Spanish."
			: "Prueba el chatbot bilingüe de Converso en vivo. Mira cómo la IA atiende a tus clientes en español e inglés.",
		alternates: {
			canonical: "https://soyconverso.com/demo",
		},
		openGraph: {
			title: "Demo | Converso",
			description: isEn
				? "Try Converso's bilingual chatbot live. See how AI serves your customers in English and Spanish."
				: "Prueba el chatbot bilingüe de Converso en vivo. Mira cómo la IA atiende a tus clientes en español e inglés.",
		},
	};
}

export default function DemoLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
