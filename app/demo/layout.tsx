import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Demo",
	description:
		"Prueba el chatbot bilingüe de Converso en vivo. Mira cómo la IA atiende a tus clientes en español e inglés.",
	openGraph: {
		title: "Demo | Converso",
		description:
			"Prueba el chatbot bilingüe de Converso en vivo. Mira cómo la IA atiende a tus clientes en español e inglés.",
	},
};

export default function DemoLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
