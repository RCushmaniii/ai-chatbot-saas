import { enUS, esES } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
	metadataBase: new URL("https://soyconverso.com"),
	title: {
		default: "Converso | AI que habla tu idioma",
		template: "%s | Converso",
	},
	description:
		"Converso es la inteligencia artificial que habla tu negocio. Chatbots bilingües para empresas en México y Norteamérica.",
	keywords: [
		"chatbot",
		"AI",
		"inteligencia artificial",
		"chatbot para empresas",
		"chatbot México",
		"bilingual chatbot",
		"customer support AI",
	],
	authors: [{ name: "Converso" }],
	openGraph: {
		type: "website",
		locale: "es_MX",
		alternateLocale: "en_US",
		url: "https://soyconverso.com",
		siteName: "Converso",
		title: "Converso | AI que habla tu idioma",
		description:
			"Chatbots inteligentes y bilingües para tu negocio. Fácil de integrar, poderoso en resultados.",
	},
	twitter: {
		card: "summary_large_image",
		title: "Converso | AI que habla tu idioma",
		description: "Chatbots inteligentes y bilingües para tu negocio.",
		creator: "@soyconverso",
	},
	robots: {
		index: true,
		follow: true,
	},
};

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
				</body>
			</html>
		</ClerkProvider>
	);
}
