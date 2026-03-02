import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Precios",
	description:
		"Planes simples y transparentes para tu chatbot bilingüe. Empieza gratis, escala cuando lo necesites.",
	openGraph: {
		title: "Precios | Converso",
		description:
			"Planes simples y transparentes para tu chatbot bilingüe. Empieza gratis, escala cuando lo necesites.",
	},
};

export default function PricingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
