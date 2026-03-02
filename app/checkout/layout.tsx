import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Pago",
	description: "Completa tu suscripción a Converso.",
	robots: { index: false, follow: false },
};

export default function CheckoutLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
