"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/use-language";
import { LanguageToggle } from "./language-toggle";

const MenuIcon = () => (
	<svg
		className="w-6 h-6"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M4 6h16M4 12h16M4 18h16"
		/>
	</svg>
);

const CloseIcon = () => (
	<svg
		className="w-6 h-6"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M6 18L18 6M6 6l12 12"
		/>
	</svg>
);

export function Navbar() {
	const { lang, setLang, t } = useLanguage();
	const { setTheme, resolvedTheme } = useTheme();
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [mounted, setMounted] = useState(false);

	const isHome = pathname === "/";

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const isDark = mounted && resolvedTheme === "dark";

	// On the homepage, use anchor links. On other pages, use absolute links.
	const navLinks = [
		{ label: t.nav.features, anchor: "#features", href: "/#features" },
		{
			label: t.nav.howItWorks,
			anchor: "#how-it-works",
			href: "/#how-it-works",
		},
		{ label: t.nav.pricing, anchor: "#pricing", href: "/pricing" },
		{ label: t.nav.faq, anchor: "#faq", href: "/#faq" },
	];

	return (
		<nav
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
				isScrolled
					? "backdrop-blur-md bg-white/95 dark:bg-zinc-900/95 border-ink/10 dark:border-white/10 shadow-sm"
					: "bg-white dark:bg-zinc-900 border-ink/10 dark:border-white/10"
			}`}
		>
			<div
				className={`max-w-7xl mx-auto px-6 transition-all duration-300 ${isScrolled ? "py-2" : "py-4"}`}
			>
				<div className="flex items-center justify-between">
					{/* Logo */}
					<Link href="/" className="flex items-center gap-3 group">
						<div
							className={`bg-gradient-to-br from-brand-cielito to-brand-jade rounded-xl flex items-center justify-center shadow-md transition-all duration-300 ${isScrolled ? "w-8 h-8" : "w-10 h-10"}`}
						>
							<span
								className={`text-white font-bold transition-all duration-300 ${isScrolled ? "text-base" : "text-lg"}`}
							>
								C
							</span>
						</div>
						<span
							className={`font-display font-bold text-ink dark:text-white tracking-tight transition-all duration-300 ${isScrolled ? "text-xl" : "text-2xl"}`}
						>
							Converso
						</span>
					</Link>

					{/* Center Nav — Desktop */}
					<div className="hidden lg:flex items-center gap-8 text-sm font-medium">
						{navLinks.map((link) => (
							<a
								key={link.anchor}
								href={isHome ? link.anchor : link.href}
								className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
							>
								{link.label}
							</a>
						))}
					</div>

					{/* Right CTAs */}
					<div className="flex items-center gap-3">
						<LanguageToggle lang={lang} onChange={setLang} />

						<button
							type="button"
							onClick={() => setTheme(isDark ? "light" : "dark")}
							className="p-2 rounded-full bg-ink/5 dark:bg-white/10 hover:bg-ink/10 dark:hover:bg-white/20 transition-colors"
							aria-label="Toggle theme"
						>
							{mounted &&
								(isDark ? (
									<Sun className="w-5 h-5 text-white" />
								) : (
									<Moon className="w-5 h-5 text-ink" />
								))}
						</button>

						<SignedOut>
							<SignInButton mode="modal">
								<button
									type="button"
									className="hidden sm:block text-sm font-medium text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
								>
									{t.nav.signIn}
								</button>
							</SignInButton>
							<SignUpButton mode="modal">
								<button
									type="button"
									className="hidden sm:block px-6 py-2.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
								>
									{t.nav.startFree}
								</button>
							</SignUpButton>
						</SignedOut>
						<SignedIn>
							<Link
								href="/chat"
								className="hidden sm:block px-6 py-2.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
							>
								{t.nav.dashboard}
							</Link>
						</SignedIn>

						{/* Mobile menu button */}
						<button
							type="button"
							className="lg:hidden p-2 text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							{mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
						</button>
					</div>
				</div>

				{/* Mobile Menu */}
				{mobileMenuOpen && (
					<div className="lg:hidden mt-4 pb-4 border-t border-ink/10 dark:border-white/10 pt-4">
						<div className="flex flex-col gap-4">
							{navLinks.map((link) => (
								<a
									key={link.anchor}
									href={isHome ? link.anchor : link.href}
									className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
									onClick={() => setMobileMenuOpen(false)}
								>
									{link.label}
								</a>
							))}
							<SignedOut>
								<SignUpButton mode="modal">
									<button
										type="button"
										className="w-full px-6 py-2.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl text-sm font-bold text-white shadow-md"
									>
										{t.nav.startFree}
									</button>
								</SignUpButton>
							</SignedOut>
							<SignedIn>
								<Link
									href="/chat"
									className="w-full px-6 py-2.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl text-sm font-bold text-white shadow-md text-center"
								>
									{t.nav.dashboard}
								</Link>
							</SignedIn>
						</div>
					</div>
				)}
			</div>
		</nav>
	);
}
