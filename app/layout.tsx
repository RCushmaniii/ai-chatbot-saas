import { enUS, esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
	const cookieStore = await cookies();
	const langCookie = cookieStore.get("converso-lang");
	const lang = langCookie?.value === "en" ? "en" : "es";

	const isEn = lang === "en";

	return {
		metadataBase: new URL("https://soyconverso.com"),
		title: {
			default: isEn
				? "Converso | AI That Speaks Your Language"
				: "Converso | AI que habla tu idioma",
			template: "%s | Converso",
		},
		description: isEn
			? "Converso is the AI that serves your customers in English and Spanish, 24/7. Bilingual chatbots for businesses in Mexico and North America."
			: "Converso es la inteligencia artificial que atiende a tus clientes en español e inglés, 24/7. Chatbots bilingües para empresas en México y Norteamérica.",
		keywords: isEn
			? [
					"bilingual chatbot",
					"business chatbot",
					"artificial intelligence",
					"chatbot Mexico",
					"AI customer service",
					"English Spanish chatbot",
					"virtual assistant business",
				]
			: [
					"chatbot bilingüe",
					"chatbot para empresas",
					"inteligencia artificial",
					"chatbot México",
					"atención al cliente AI",
					"chatbot español inglés",
					"asistente virtual empresas",
				],
		authors: [{ name: "Converso" }],
		openGraph: {
			type: "website",
			locale: isEn ? "en_US" : "es_MX",
			alternateLocale: isEn ? "es_MX" : "en_US",
			url: "https://soyconverso.com",
			siteName: "Converso",
			title: isEn
				? "Converso | AI That Speaks Your Language"
				: "Converso | AI que habla tu idioma",
			description: isEn
				? "Smart bilingual chatbots for your business. Customer service in English and Spanish, 24/7."
				: "Chatbots inteligentes y bilingües para tu negocio. Atención al cliente en español e inglés, 24/7.",
		},
		twitter: {
			card: "summary_large_image",
			title: isEn
				? "Converso | AI That Speaks Your Language"
				: "Converso | AI que habla tu idioma",
			description: isEn
				? "Smart bilingual chatbots for your business. Customer service in English and Spanish, 24/7."
				: "Chatbots inteligentes y bilingües para tu negocio. Atención al cliente en español e inglés, 24/7.",
			creator: "@soyconverso",
		},
		alternates: {
			canonical: "https://soyconverso.com",
			languages: {
				"es-MX": "https://soyconverso.com",
				"en-US": "https://soyconverso.com",
			},
		},
		robots: {
			index: true,
			follow: true,
		},
	};
}

export const viewport = {
	maximumScale: 1, // Disable auto-zoom on mobile Safari
};

// Converso Typography: Inter (body) + Plus Jakarta Sans (display)
const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-plus-jakarta",
	weight: ["500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-geist-mono",
});

// Converso theme colors (Cielito Lindo palette)
const LIGHT_THEME_COLOR = "#F9F7F2"; // surface-sand
const DARK_THEME_COLOR = "#0F1419";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Read language preference from cookie for Clerk localization
	const cookieStore = await cookies();
	const langCookie = cookieStore.get("converso-lang");
	const lang = langCookie?.value === "en" ? "en" : "es";
	const clerkLocalization = lang === "en" ? enUS : esES;

	return (
		<ClerkProvider localization={clerkLocalization}>
			<html
				className={`${inter.variable} ${plusJakarta.variable} ${geistMono.variable}`}
				// `next-themes` injects an extra classname to the body element to avoid
				// visual flicker before hydration. Hence the `suppressHydrationWarning`
				// prop is necessary to avoid the React hydration mismatch warning.
				// https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
				lang={lang}
				suppressHydrationWarning
			>
				<head>
					<script
						// biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
						dangerouslySetInnerHTML={{
							__html: THEME_COLOR_SCRIPT,
						}}
					/>
				</head>
				<body className="antialiased font-sans">
					<ThemeProvider
						attribute="class"
						defaultTheme="light"
						disableTransitionOnChange
						enableSystem
					>
						<Toaster position="top-center" />
						{children}
					</ThemeProvider>
					<Analytics />
					<SpeedInsights />
				</body>
			</html>
		</ClerkProvider>
	);
}
