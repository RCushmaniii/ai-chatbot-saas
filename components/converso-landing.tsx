"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/use-language";
import { LanguageToggle } from "./language-toggle";

// Icons
const CheckIcon = () => (
	<svg
		className="w-5 h-5 text-brand-jade flex-shrink-0"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M5 13l4 4L19 7"
		/>
	</svg>
);

const ChevronDownIcon = () => (
	<svg
		className="w-5 h-5"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M19 9l-7 7-7-7"
		/>
	</svg>
);

const MessageIcon = () => (
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
			d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
		/>
	</svg>
);

const BrainIcon = () => (
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
			d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
		/>
	</svg>
);

const GlobeIcon = () => (
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
			d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
		/>
	</svg>
);

const ChartIcon = () => (
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
			d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
		/>
	</svg>
);

const ShieldIcon = () => (
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
			d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
		/>
	</svg>
);

const PlugIcon = () => (
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
			d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
		/>
	</svg>
);

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

export function ConversoLandingPage() {
	const { lang, setLang, t } = useLanguage();
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const [isAnnual, setIsAnnual] = useState(true);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [demoMessages, setDemoMessages] = useState<
		Array<{ role: string; content: string }>
	>([]);
	const [isTyping, setIsTyping] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [mounted, setMounted] = useState(false);

	// Handle hydration for theme
	useEffect(() => {
		setMounted(true);
	}, []);

	// Scroll detection for navbar
	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	// Demo chat simulation
	useEffect(() => {
		const demoSequence = async () => {
			await new Promise((r) => setTimeout(r, 2000));
			setDemoMessages([{ role: "user", content: t.demo.userMessage }]);
			setIsTyping(true);
			await new Promise((r) => setTimeout(r, 1500));
			setIsTyping(false);
			setDemoMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: t.demo.botResponse,
				},
			]);
		};
		demoSequence();
	}, [t.demo.userMessage, t.demo.botResponse]);

	const isDark = mounted && resolvedTheme === "dark";

	const planKeys = ["free", "starter", "pro", "business"] as const;
	const planPrices = {
		free: { monthly: 0, annual: 0 },
		starter: { monthly: 19, annual: 15 },
		pro: { monthly: 49, annual: 39 },
		business: { monthly: 99, annual: 79 },
	};

	const features = [
		{ key: "bilingual" as const, icon: <GlobeIcon /> },
		{ key: "learns" as const, icon: <BrainIcon /> },
		{ key: "widget" as const, icon: <MessageIcon /> },
		{ key: "analytics" as const, icon: <ChartIcon /> },
		{ key: "integrations" as const, icon: <PlugIcon /> },
		{ key: "security" as const, icon: <ShieldIcon /> },
	];

	const steps = [
		{ key: "step1" as const, color: "from-brand-cielito to-brand-cielito" },
		{ key: "step2" as const, color: "from-brand-jade to-brand-jade" },
		{
			key: "step3" as const,
			color: "from-brand-terracotta to-brand-terracotta",
		},
	];

	return (
		<div className="min-h-screen bg-surface-sand dark:bg-ink">
			{/* Navigation - Fixed positioning for reliable sticky behavior */}
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
						{/* Logo - shrinks on scroll */}
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

						{/* Center Nav - Desktop */}
						<div className="hidden lg:flex items-center gap-8 text-sm font-medium">
							<a
								href="#features"
								className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
							>
								{t.nav.features}
							</a>
							<a
								href="#how-it-works"
								className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
							>
								{t.nav.howItWorks}
							</a>
							<a
								href="#pricing"
								className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
							>
								{t.nav.pricing}
							</a>
							<a
								href="#faq"
								className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
							>
								{t.nav.faq}
							</a>
						</div>

						{/* Right CTAs */}
						<div className="flex items-center gap-3">
							{/* Language Toggle */}
							<LanguageToggle lang={lang} onChange={setLang} />

							{/* Theme Toggle */}
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
								<a
									href="#features"
									className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
									onClick={() => setMobileMenuOpen(false)}
								>
									{t.nav.features}
								</a>
								<a
									href="#how-it-works"
									className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
									onClick={() => setMobileMenuOpen(false)}
								>
									{t.nav.howItWorks}
								</a>
								<a
									href="#pricing"
									className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
									onClick={() => setMobileMenuOpen(false)}
								>
									{t.nav.pricing}
								</a>
								<a
									href="#faq"
									className="text-ink/70 dark:text-white/70 hover:text-ink dark:hover:text-white transition-colors"
									onClick={() => setMobileMenuOpen(false)}
								>
									{t.nav.faq}
								</a>
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

			{/* Spacer for fixed nav */}
			<div className="h-[72px]" />

			{/* Hero Section */}
			<section className="relative pt-16 pb-24 px-6 overflow-hidden">
				{/* Background decorations */}
				<div className="absolute top-0 right-0 w-96 h-96 bg-brand-cielito/10 dark:bg-brand-cielito/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
				<div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-jade/10 dark:bg-brand-jade/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

				<div className="max-w-7xl mx-auto relative">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						{/* Left: Copy */}
						<div>
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 rounded-full shadow-sm mb-6">
								<span className="w-2 h-2 bg-brand-jade rounded-full animate-pulse" />
								<span className="text-sm font-medium text-ink/70 dark:text-white/70">
									{t.hero.badge}
								</span>
							</div>

							<h1 className="text-5xl lg:text-6xl font-display font-bold leading-[1.1] mb-6 text-ink dark:text-white">
								{t.hero.titlePart1}{" "}
								<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cielito to-brand-jade">
									{t.hero.titleHighlight}
								</span>
							</h1>

							<p className="text-xl text-ink/70 dark:text-white/70 mb-4 leading-relaxed max-w-xl">
								{t.hero.description}
							</p>

							<p className="text-sm text-ink/50 dark:text-white/50 mb-8 max-w-xl">
								{t.hero.subtext}
							</p>

							<div className="flex flex-col sm:flex-row gap-4 mb-12">
								<SignedOut>
									<SignUpButton mode="modal">
										<button
											type="button"
											className="px-8 py-4 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
										>
											{t.hero.ctaPrimary}
										</button>
									</SignUpButton>
								</SignedOut>
								<SignedIn>
									<Link
										href="/chat"
										className="px-8 py-4 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-center"
									>
										{t.nav.dashboard}
									</Link>
								</SignedIn>
								<a
									href="#demo"
									className="px-8 py-4 border-2 border-ink/20 dark:border-white/20 rounded-xl font-bold text-lg text-ink dark:text-white hover:border-brand-cielito hover:bg-brand-cielito/5 dark:hover:bg-brand-cielito/10 transition-all text-center"
								>
									{t.hero.ctaSecondary}
								</a>
							</div>

							{/* Trust indicators */}
							<div className="flex flex-wrap items-center gap-6 text-sm text-ink/50 dark:text-white/50">
								<div className="flex items-center gap-2">
									<CheckIcon />
									<span>{t.hero.trustNoCard}</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckIcon />
									<span>{t.hero.trustMinutes}</span>
								</div>
								<div className="flex items-center gap-2">
									<CheckIcon />
									<span>{t.hero.trustCancel}</span>
								</div>
							</div>
						</div>

						{/* Right: Live Demo Widget */}
						<div className="relative" id="demo">
							<div className="bg-white rounded-2xl shadow-2xl border border-ink/5 overflow-hidden">
								{/* Widget header */}
								<div className="bg-gradient-to-r from-brand-cielito to-brand-jade p-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
											<MessageIcon />
										</div>
										<div className="text-white">
											<div className="font-bold">{t.demo.title}</div>
											<div className="text-sm text-white/80 flex items-center gap-2">
												<span className="w-2 h-2 bg-green-400 rounded-full" />
												{t.demo.online}
											</div>
										</div>
									</div>
								</div>

								{/* Chat area */}
								<div className="h-80 p-4 space-y-4 bg-gray-50">
									{/* Welcome message */}
									<div className="flex gap-3">
										<div className="w-8 h-8 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-full flex-shrink-0 flex items-center justify-center">
											<span className="text-white text-xs font-bold">C</span>
										</div>
										<div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[80%]">
											<p className="text-sm text-ink">
												{t.demo.welcomeMessage}
											</p>
										</div>
									</div>

									{/* Demo messages */}
									{demoMessages.map((msg, i) => (
										<div
											key={i}
											className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
										>
											{msg.role === "assistant" && (
												<div className="w-8 h-8 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-full flex-shrink-0 flex items-center justify-center">
													<span className="text-white text-xs font-bold">
														C
													</span>
												</div>
											)}
											<div
												className={`rounded-2xl px-4 py-3 max-w-[80%] ${
													msg.role === "user"
														? "bg-brand-cielito text-white rounded-tr-sm"
														: "bg-white shadow-sm rounded-tl-sm"
												}`}
											>
												<p className="text-sm">{msg.content}</p>
											</div>
										</div>
									))}

									{/* Typing indicator */}
									{isTyping && (
										<div className="flex gap-3">
											<div className="w-8 h-8 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-full flex-shrink-0 flex items-center justify-center">
												<span className="text-white text-xs font-bold">C</span>
											</div>
											<div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
												<div className="flex gap-1">
													<span className="w-2 h-2 bg-ink/30 rounded-full animate-bounce" />
													<span
														className="w-2 h-2 bg-ink/30 rounded-full animate-bounce"
														style={{ animationDelay: "0.1s" }}
													/>
													<span
														className="w-2 h-2 bg-ink/30 rounded-full animate-bounce"
														style={{ animationDelay: "0.2s" }}
													/>
												</div>
											</div>
										</div>
									)}
								</div>

								{/* Input area */}
								<div className="p-4 border-t border-ink/5 bg-white">
									<div className="flex gap-2">
										<input
											type="text"
											placeholder={t.demo.placeholder}
											className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-cielito/50"
											disabled
										/>
										<button
											type="button"
											className="px-4 py-3 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl text-white font-medium"
										>
											<svg
												className="w-5 h-5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
												/>
											</svg>
										</button>
									</div>
								</div>
							</div>

							{/* Decorative elements */}
							<div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand-terracotta/20 blur-2xl rounded-full" />
							<div className="absolute -top-4 -left-4 w-16 h-16 bg-brand-jade/20 blur-2xl rounded-full" />
						</div>
					</div>
				</div>
			</section>

			{/* Stats Bar */}
			<section className="py-12 px-6 bg-white dark:bg-white/5 border-y border-ink/5 dark:border-white/5">
				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
						<div>
							<div className="text-4xl font-display font-bold text-brand-cielito mb-2">
								85%
							</div>
							<div className="text-sm text-ink/60 dark:text-white/60">
								{t.stats.resolved}
							</div>
						</div>
						<div>
							<div className="text-4xl font-display font-bold text-brand-jade mb-2">
								24/7
							</div>
							<div className="text-sm text-ink/60 dark:text-white/60">
								{t.stats.availability}
							</div>
						</div>
						<div>
							<div className="text-4xl font-display font-bold text-brand-terracotta mb-2">
								3x
							</div>
							<div className="text-sm text-ink/60 dark:text-white/60">
								{t.stats.faster}
							</div>
						</div>
						<div>
							<div className="text-4xl font-display font-bold text-ink dark:text-white mb-2">
								2 min
							</div>
							<div className="text-sm text-ink/60 dark:text-white/60">
								{t.stats.setup}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section id="features" className="py-24 px-6">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-display font-bold text-ink dark:text-white mb-4">
							{t.features.title}
						</h2>
						<p className="text-xl text-ink/60 dark:text-white/60 max-w-2xl mx-auto">
							{t.features.subtitle}
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
						{features.map((feature) => (
							<div
								key={feature.key}
								className="group p-8 bg-white dark:bg-white/5 rounded-2xl border border-ink/5 dark:border-white/10 shadow-sm hover:shadow-lg hover:border-brand-cielito/30 transition-all hover:-translate-y-1"
							>
								<div className="w-12 h-12 bg-gradient-to-br from-brand-cielito/10 to-brand-jade/10 rounded-xl flex items-center justify-center mb-6 text-brand-cielito group-hover:from-brand-cielito group-hover:to-brand-jade group-hover:text-white transition-all">
									{feature.icon}
								</div>
								<h3 className="text-xl font-display font-bold text-ink dark:text-white mb-3">
									{t.features[feature.key].title}
								</h3>
								<p className="text-ink/60 dark:text-white/60 leading-relaxed">
									{t.features[feature.key].description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* How It Works */}
			<section
				id="how-it-works"
				className="py-24 px-6 bg-white dark:bg-white/5"
			>
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-display font-bold text-ink dark:text-white mb-4">
							{t.howItWorks.title}
						</h2>
						<p className="text-xl text-ink/60 dark:text-white/60">
							{t.howItWorks.subtitle}
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-12 relative">
						{/* Connector line */}
						<div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-brand-cielito via-brand-jade to-brand-terracotta" />

						{steps.map((step, i) => (
							<div key={step.key} className="text-center relative">
								<div
									className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-lg relative z-10`}
								>
									{i + 1}
								</div>
								<h3 className="text-xl font-display font-bold text-ink dark:text-white mb-3">
									{t.howItWorks[step.key].title}
								</h3>
								<p className="text-ink/60 dark:text-white/60 leading-relaxed">
									{t.howItWorks[step.key].description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Founder Story */}
			<section className="py-24 px-6 bg-gradient-to-br from-brand-cielito/5 to-brand-jade/5 dark:from-brand-cielito/10 dark:to-brand-jade/10">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-4xl font-display font-bold text-ink dark:text-white mb-4">
							{t.founderStory.title}
						</h2>
					</div>

					<div className="bg-white dark:bg-white/5 rounded-2xl p-10 md:p-12 shadow-lg border border-ink/5 dark:border-white/10 relative">
						<div className="text-6xl text-brand-cielito/30 absolute top-6 left-8">
							"
						</div>
						<blockquote className="text-xl md:text-2xl text-ink/80 dark:text-white/80 leading-relaxed mb-8 relative z-10 pl-8">
							{t.founderStory.quote}
						</blockquote>
						<div className="flex items-center gap-4 pl-8">
							<div className="w-14 h-14 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-full flex items-center justify-center">
								<span className="text-white font-bold text-xl">R</span>
							</div>
							<div>
								<div className="font-bold text-lg text-ink dark:text-white">
									{t.founderStory.name}
								</div>
								<div className="text-ink/50 dark:text-white/50">
									{t.founderStory.role}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Pricing */}
			<section id="pricing" className="py-24 px-6">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-4xl font-display font-bold text-ink dark:text-white mb-4">
							{t.pricing.title}
						</h2>
						<p className="text-xl text-ink/60 dark:text-white/60 mb-8">
							{t.pricing.subtitle}
						</p>

						{/* Toggle */}
						<div className="inline-flex items-center gap-4 bg-white dark:bg-white/10 border border-ink/10 dark:border-white/10 rounded-xl p-1 shadow-sm">
							<button
								type="button"
								onClick={() => setIsAnnual(false)}
								className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
									!isAnnual
										? "bg-brand-cielito text-white shadow"
										: "text-ink/60 dark:text-white/60"
								}`}
							>
								{t.pricing.monthly}
							</button>
							<button
								type="button"
								onClick={() => setIsAnnual(true)}
								className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
									isAnnual
										? "bg-brand-cielito text-white shadow"
										: "text-ink/60 dark:text-white/60"
								}`}
							>
								{t.pricing.annual}{" "}
								<span className="text-xs ml-1 text-brand-jade font-bold">
									{isAnnual ? t.pricing.annualDiscount : ""}
								</span>
							</button>
						</div>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
						{planKeys.map((planKey) => {
							const plan = t.pricing.plans[planKey];
							const price = planPrices[planKey];
							const isPopular = planKey === "starter";

							return (
								<div
									key={planKey}
									className={`relative bg-white dark:bg-white/5 rounded-2xl p-8 border-2 transition-all hover:-translate-y-1 ${
										isPopular
											? "border-brand-cielito shadow-xl"
											: "border-ink/5 dark:border-white/10 shadow-sm hover:border-brand-cielito/30 hover:shadow-lg"
									}`}
								>
									{isPopular && (
										<div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-full text-xs font-bold text-white">
											{t.pricing.mostPopular}
										</div>
									)}

									<div className="text-sm font-medium text-ink/50 dark:text-white/50 mb-2">
										{plan.name}
									</div>
									<div className="text-4xl font-display font-bold text-ink dark:text-white mb-1">
										${isAnnual ? price.annual : price.monthly}
										<span className="text-lg text-ink/50 dark:text-white/50 font-normal">
											{t.pricing.perMonth}
										</span>
									</div>
									<div className="text-sm text-ink/50 dark:text-white/50 mb-6">
										{plan.description}
									</div>

									<ul className="space-y-3 mb-8">
										{plan.features.map((feature, j) => (
											<li
												key={j}
												className="flex items-start gap-3 text-sm text-ink/70 dark:text-white/70"
											>
												<CheckIcon />
												<span>{feature}</span>
											</li>
										))}
									</ul>

									<SignedOut>
										<SignUpButton mode="modal">
											<button
												type="button"
												className={`w-full py-3 rounded-xl font-bold transition-all ${
													isPopular
														? "bg-gradient-to-r from-brand-cielito to-brand-jade text-white hover:shadow-lg"
														: "border-2 border-ink/20 dark:border-white/20 text-ink dark:text-white hover:border-brand-cielito hover:bg-brand-cielito/5"
												}`}
											>
												{plan.cta}
											</button>
										</SignUpButton>
									</SignedOut>
									<SignedIn>
										<Link
											href="/chat"
											className={`block w-full py-3 rounded-xl font-bold text-center transition-all ${
												isPopular
													? "bg-gradient-to-r from-brand-cielito to-brand-jade text-white hover:shadow-lg"
													: "border-2 border-ink/20 dark:border-white/20 text-ink dark:text-white hover:border-brand-cielito hover:bg-brand-cielito/5"
											}`}
										>
											{t.nav.dashboard}
										</Link>
									</SignedIn>
								</div>
							);
						})}
					</div>

					<p className="text-center text-sm text-ink/50 dark:text-white/50 mt-8">
						{t.pricing.trial}
					</p>
				</div>
			</section>

			{/* FAQ */}
			<section id="faq" className="py-24 px-6 bg-white dark:bg-white/5">
				<div className="max-w-3xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-4xl font-display font-bold text-ink dark:text-white mb-4">
							{t.faq.title}
						</h2>
					</div>

					<div className="space-y-4">
						{t.faq.items.map((faq, i) => (
							<div
								key={i}
								className="border border-ink/10 dark:border-white/10 rounded-xl overflow-hidden bg-surface-sand/50 dark:bg-white/5"
							>
								<button
									type="button"
									onClick={() => setOpenFaq(openFaq === i ? null : i)}
									className="w-full flex items-center justify-between p-6 text-left hover:bg-white/50 dark:hover:bg-white/10 transition-all"
								>
									<span className="font-bold text-ink dark:text-white">
										{faq.q}
									</span>
									<div
										className={`transition-transform text-ink/50 dark:text-white/50 ${openFaq === i ? "rotate-180" : ""}`}
									>
										<ChevronDownIcon />
									</div>
								</button>
								{openFaq === i && (
									<div className="px-6 pb-6 border-t border-ink/5 dark:border-white/10 pt-4">
										<p className="text-ink/70 dark:text-white/70 leading-relaxed">
											{faq.a}
										</p>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Final CTA */}
			<section className="py-24 px-6 bg-gradient-to-br from-brand-cielito to-brand-jade relative overflow-hidden">
				{/* Background pattern */}
				<div className="absolute inset-0 opacity-10">
					<div
						className="absolute inset-0"
						style={{
							backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
						}}
					/>
				</div>

				<div className="max-w-4xl mx-auto text-center relative z-10">
					<h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
						{t.cta.title}
					</h2>
					<p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
						{t.cta.subtitle}
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
						<SignedOut>
							<SignUpButton mode="modal">
								<button
									type="button"
									className="px-10 py-5 bg-white rounded-xl font-bold text-lg text-brand-cielito shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
								>
									{t.cta.primary}
								</button>
							</SignUpButton>
						</SignedOut>
						<SignedIn>
							<Link
								href="/chat"
								className="px-10 py-5 bg-white rounded-xl font-bold text-lg text-brand-cielito shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
							>
								{t.nav.dashboard}
							</Link>
						</SignedIn>
						<a
							href="mailto:hola@soyconverso.com"
							className="px-10 py-5 border-2 border-white/30 rounded-xl font-bold text-lg text-white hover:bg-white/10 transition-all"
						>
							{t.cta.secondary}
						</a>
					</div>

					<p className="text-sm text-white/60">{t.cta.trust}</p>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-ink text-white py-16 px-6">
				<div className="max-w-7xl mx-auto">
					<div className="grid md:grid-cols-5 gap-12 mb-12">
						{/* Brand */}
						<div className="md:col-span-2">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-10 h-10 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-xl flex items-center justify-center">
									<span className="text-white font-bold">C</span>
								</div>
								<span className="text-xl font-display font-bold">Converso</span>
							</div>
							<p className="text-white/60 text-sm leading-relaxed mb-4">
								{t.footer.tagline}
							</p>
							<p className="text-white/40 text-xs">{t.footer.copyright}</p>
						</div>

						{/* Product */}
						<div>
							<div className="text-sm font-bold mb-4 text-white/50">
								{t.footer.product}
							</div>
							<ul className="space-y-3 text-sm text-white/60">
								<li>
									<a
										href="#features"
										className="hover:text-white transition-colors"
									>
										{t.footer.features}
									</a>
								</li>
								<li>
									<a
										href="#pricing"
										className="hover:text-white transition-colors"
									>
										{t.footer.pricing}
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white transition-colors">
										{t.footer.integrations}
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white transition-colors">
										{t.footer.api}
									</a>
								</li>
							</ul>
						</div>

						{/* Resources */}
						<div>
							<div className="text-sm font-bold mb-4 text-white/50">
								{t.footer.resources}
							</div>
							<ul className="space-y-3 text-sm text-white/60">
								<li>
									<Link
										href="/documentation"
										className="hover:text-white transition-colors"
									>
										{t.footer.documentation}
									</Link>
								</li>
								<li>
									<a href="#" className="hover:text-white transition-colors">
										{t.footer.blog}
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white transition-colors">
										{t.footer.guides}
									</a>
								</li>
								<li>
									<a href="#faq" className="hover:text-white transition-colors">
										FAQ
									</a>
								</li>
							</ul>
						</div>

						{/* Legal */}
						<div>
							<div className="text-sm font-bold mb-4 text-white/50">
								{t.footer.legal}
							</div>
							<ul className="space-y-3 text-sm text-white/60">
								<li>
									<a href="#" className="hover:text-white transition-colors">
										{t.footer.privacy}
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white transition-colors">
										{t.footer.terms}
									</a>
								</li>
								<li>
									<a href="#" className="hover:text-white transition-colors">
										{t.footer.security}
									</a>
								</li>
							</ul>
						</div>
					</div>

					<div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
						<div className="text-sm text-white/40">{t.footer.madeWith}</div>
						<div className="flex gap-4">
							<a
								href="#"
								className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-brand-cielito hover:bg-brand-cielito/10 transition-all"
							>
								<span className="text-xs">X</span>
							</a>
							<a
								href="#"
								className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-brand-cielito hover:bg-brand-cielito/10 transition-all"
							>
								<span className="text-xs">in</span>
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
