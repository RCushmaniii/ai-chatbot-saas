"use client";

import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/use-language";
import { LanguageToggle } from "@/components/language-toggle";

export default function DemoPage() {
	const { lang, setLang } = useLanguage();
	const isEs = lang === "es";

	return (
		<div className="min-h-screen bg-ink">
			{/* Minimal nav */}
			<nav className="px-6 py-4 flex items-center justify-between">
				<Link href="/" className="flex items-center gap-3 group">
					<div className="w-9 h-9 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-xl flex items-center justify-center shadow-md">
						<span className="text-white font-bold">C</span>
					</div>
					<span className="font-display font-bold text-xl text-white tracking-tight">
						Converso
					</span>
				</Link>
				<div className="flex items-center gap-4">
					<LanguageToggle lang={lang} onChange={setLang} />
					<SignedOut>
						<SignUpButton mode="modal">
							<button
								type="button"
								className="px-5 py-2 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-white text-sm shadow-md hover:shadow-lg transition-all"
							>
								{isEs ? "Empieza Gratis" : "Start Free"}
							</button>
						</SignUpButton>
					</SignedOut>
					<SignedIn>
						<Link
							href="/chat"
							className="px-5 py-2 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-white text-sm shadow-md hover:shadow-lg transition-all"
						>
							{isEs ? "Ir al Dashboard" : "Go to Dashboard"}
						</Link>
					</SignedIn>
				</div>
			</nav>

			{/* Header */}
			<div className="text-center px-6 pt-10 pb-6">
				<h1 className="text-white font-display font-bold text-2xl sm:text-3xl mb-2">
					{isEs ? "Converso en acción" : "Converso in action"}
				</h1>
				<p className="text-white/50 text-sm max-w-lg mx-auto">
					{isEs
						? "Mira cómo un chatbot bilingüe atiende clientes, cambia de idioma automáticamente y captura leads — todo sin intervención humana."
						: "Watch a bilingual chatbot serve customers, switch languages automatically, and capture leads — all without human intervention."}
				</p>
			</div>

			{/* Video 1 — Bilingual conversation (autoplay) */}
			<section className="px-6 pb-6">
				<div className="max-w-4xl mx-auto">
					<h2 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-3 text-center">
						{isEs ? "Conversación bilingüe en vivo" : "Live bilingual conversation"}
					</h2>
					<div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
						<video
							autoPlay
							muted
							playsInline
							controls
							preload="auto"
							className="w-full aspect-video bg-black"
						>
							<source
								src="/video/Video_Generation_With_Spanish_Conversation.mp4"
								type="video/mp4"
							/>
							<track kind="captions" />
						</video>
					</div>
				</div>
			</section>

			{/* Video 2 — Product brief */}
			<section className="px-6 pb-12">
				<div className="max-w-4xl mx-auto">
					<h2 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-3 text-center">
						{isEs ? "Resumen del producto" : "Product overview"}
					</h2>
					<div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
						<video
							playsInline
							controls
							preload="metadata"
							poster="/video/converso-brief-poster.jpg"
							className="w-full aspect-video bg-black"
						>
							<source
								src="/video/converso-brief.mp4"
								type="video/mp4"
							/>
							<track kind="captions" />
						</video>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-6 pb-16 text-center">
				<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
					<SignedOut>
						<SignUpButton mode="modal">
							<button
								type="button"
								className="px-8 py-3.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
							>
								{isEs ? "Empieza Gratis" : "Start Free"}
							</button>
						</SignUpButton>
					</SignedOut>
					<SignedIn>
						<Link
							href="/chat"
							className="px-8 py-3.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
						>
							{isEs ? "Ir al Dashboard" : "Go to Dashboard"}
						</Link>
					</SignedIn>
					<Link
						href="/pricing"
						className="px-8 py-3.5 border border-white/20 rounded-xl font-bold text-white hover:bg-white/5 transition-all"
					>
						{isEs ? "Ver Precios" : "View Pricing"}
					</Link>
				</div>
				<p className="text-white/30 text-xs mt-6">
					{isEs
						? "Sin tarjeta de crédito \u2022 14 días de prueba \u2022 Configuración en minutos"
						: "No credit card \u2022 14-day free trial \u2022 Setup in minutes"}
				</p>
			</section>
		</div>
	);
}
