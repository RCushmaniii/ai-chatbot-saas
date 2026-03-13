"use client";

import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { useLanguage } from "@/lib/i18n/use-language";

// Industry icons for social proof strip (greyscale, generic)
const DentalIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 2C9.5 2 7 4 7 7c0 2 .5 3 1 5s1.5 6 2 7c.3.6.6 1 1 1h2c.4 0 .7-.4 1-1 .5-1 1.5-5 2-7s1-3 1-5c0-3-2.5-5-5-5z"
		/>
	</svg>
);

const LegalIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zM18.82 9L12 12.72 5.18 9 12 5.28 18.82 9z"
		/>
	</svg>
);

const HVACIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
		/>
	</svg>
);

const RestaurantIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M3 3v18h2v-7h4v7h2V3H9v8H5V3H3zm14 0c-2.2 0-4 1.8-4 4v4h2v12h2V11h2V7c0-2.2-1.8-4-4-4z"
		/>
	</svg>
);

const AutoIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M19 17h2l.6-2.4c.2-.7.4-1.3.4-1.6 0-1-.4-1.7-1-2l-2-5h-14l-2 5c-.6.3-1 1-1 2 0 .3.2.9.4 1.6L3 17h2m14 0a2 2 0 11-4 0m4 0a2 2 0 10-4 0M9 17a2 2 0 11-4 0m4 0a2 2 0 10-4 0"
		/>
	</svg>
);

const SalonIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M14.121 14.121A3 3 0 009.88 9.88m4.242 4.242L18 18m-3.879-3.879A3 3 0 009.88 9.88m0 0L6 6m9 3a6 6 0 11-12 0 6 6 0 0112 0z"
		/>
	</svg>
);

// Feature pillar icons
const BilingualIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
		/>
	</svg>
);

const LeadCaptureIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
		/>
	</svg>
);

const ZeroInterventionIcon = () => (
	<svg
		className="w-8 h-8"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
		/>
	</svg>
);

export default function DemoPage() {
	const { t } = useLanguage();

	const industries = [
		{ icon: <DentalIcon />, label: "Dental" },
		{ icon: <LegalIcon />, label: "Legal" },
		{ icon: <HVACIcon />, label: "HVAC" },
		{ icon: <RestaurantIcon />, label: "Restaurant" },
		{ icon: <AutoIcon />, label: "Auto" },
		{ icon: <SalonIcon />, label: "Salon" },
	];

	const pillars = [
		{
			icon: <BilingualIcon />,
			title: t.demoPage.pillars.bilingual.title,
			description: t.demoPage.pillars.bilingual.description,
		},
		{
			icon: <LeadCaptureIcon />,
			title: t.demoPage.pillars.leadCapture.title,
			description: t.demoPage.pillars.leadCapture.description,
		},
		{
			icon: <ZeroInterventionIcon />,
			title: t.demoPage.pillars.zeroIntervention.title,
			description: t.demoPage.pillars.zeroIntervention.description,
		},
	];

	return (
		<div className="dark">
			<div className="min-h-screen bg-ink">
				<Navbar />

				{/* Header */}
				<div className="text-center px-6 pt-28 pb-10">
					<h1 className="text-white font-display font-bold text-2xl sm:text-3xl mb-2">
						{t.demoPage.headerTitle}
					</h1>
					<p className="text-white/50 text-sm max-w-lg mx-auto">
						{t.demoPage.headerSubtitle}
					</p>
				</div>

				{/* Video 1 — Bilingual conversation (autoplay) */}
				<section className="px-6 pb-10">
					<div className="max-w-4xl mx-auto">
						<h2 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-3 text-center">
							{t.demoPage.videoLabel1}
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
									src="/video/converso-bilingual-demo.mp4"
									type="video/mp4"
								/>
								<track kind="captions" />
							</video>
						</div>
					</div>
				</section>

				{/* Social Proof Strip */}
				<section className="px-6 py-12">
					<div className="max-w-4xl mx-auto text-center">
						<p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-6">
							{t.demoPage.socialProof.trustedBy}
						</p>
						<div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
							{industries.map((industry) => (
								<div
									key={industry.label}
									className="flex flex-col items-center gap-2 text-white/20"
								>
									{industry.icon}
									<span className="text-[10px] uppercase tracking-wider font-medium">
										{industry.label}
									</span>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Video 2 — Product brief */}
				<section className="px-6 pb-12">
					<div className="max-w-4xl mx-auto">
						<h2 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-3 text-center">
							{t.demoPage.videoLabel2}
						</h2>
						<div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
							<video
								playsInline
								controls
								preload="metadata"
								poster="/video/converso-brief-poster.jpg"
								className="w-full aspect-video bg-black"
							>
								<source src="/video/converso-brief.mp4" type="video/mp4" />
								<track kind="captions" />
							</video>
						</div>
					</div>
				</section>

				{/* Feature Pillars */}
				<section className="px-6 py-20">
					<div className="max-w-5xl mx-auto">
						<h2 className="text-white font-display font-bold text-2xl sm:text-3xl text-center mb-12">
							{t.demoPage.pillars.title}
						</h2>
						<div className="grid md:grid-cols-3 gap-8">
							{pillars.map((pillar) => (
								<div
									key={pillar.title}
									className="p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
								>
									<div className="w-14 h-14 bg-gradient-to-br from-brand-cielito/20 to-brand-jade/20 rounded-xl flex items-center justify-center mb-5 text-brand-cielito">
										{pillar.icon}
									</div>
									<h3 className="text-white font-display font-bold text-lg mb-3">
										{pillar.title}
									</h3>
									<p className="text-white/50 text-sm leading-relaxed">
										{pillar.description}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* Micro-Testimonial */}
				<section className="px-6 py-16">
					<div className="max-w-3xl mx-auto text-center">
						<div className="relative">
							<div className="text-5xl text-brand-cielito/20 leading-none mb-4">
								&ldquo;
							</div>
							<blockquote className="text-white/80 text-lg md:text-xl font-medium leading-relaxed mb-6">
								{t.demoPage.testimonial}
							</blockquote>
							<div className="flex items-center justify-center gap-3">
								<div className="w-10 h-10 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-full flex items-center justify-center">
									<span className="text-white text-sm font-bold">
										{t.demoPage.testimonialAuthor[0]}
									</span>
								</div>
								<div className="text-left">
									<div className="text-white font-medium text-sm">
										{t.demoPage.testimonialAuthor}
									</div>
									<div className="text-white/40 text-xs">
										{t.demoPage.testimonialRole}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* CTA */}
				<section className="px-6 pb-16 pt-8 text-center">
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<SignedOut>
							<SignUpButton mode="modal">
								<button
									type="button"
									className="px-8 py-3.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
								>
									{t.nav.startFree}
								</button>
							</SignUpButton>
						</SignedOut>
						<SignedIn>
							<Link
								href="/chat"
								className="px-8 py-3.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
							>
								{t.nav.dashboard}
							</Link>
						</SignedIn>
						<Link
							href="/pricing"
							className="px-8 py-3.5 border border-white/20 rounded-xl font-bold text-white hover:bg-white/5 transition-all"
						>
							{t.nav.pricing}
						</Link>
					</div>
					<p className="text-white/30 text-xs mt-6">{t.cta.trust}</p>
				</section>

				<Footer />
			</div>
		</div>
	);
}
