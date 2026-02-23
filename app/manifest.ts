import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Converso - AI que habla tu idioma",
		short_name: "Converso",
		description:
			"Chatbots inteligentes y bilingües para tu negocio. Fácil de integrar, poderoso en resultados.",
		start_url: "/",
		display: "standalone",
		background_color: "#F9F7F2",
		theme_color: "#20b2aa",
		icons: [
			{
				src: "/icon.svg",
				sizes: "any",
				type: "image/svg+xml",
			},
		],
	};
}
