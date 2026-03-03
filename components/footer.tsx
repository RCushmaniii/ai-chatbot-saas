"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/use-language";

export function Footer() {
	const { t } = useLanguage();
	const pathname = usePathname();
	const isHome = pathname === "/";

	// On homepage use anchor links, on other pages use absolute links
	const link = (anchor: string, fallback: string) =>
		isHome ? anchor : fallback;

	return (
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
									href={link("#features", "/#features")}
									className="hover:text-white transition-colors"
								>
									{t.footer.features}
								</a>
							</li>
							<li>
								<a
									href={link("#pricing", "/pricing")}
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
								<a
									href={link("#faq", "/#faq")}
									className="hover:text-white transition-colors"
								>
									{t.footer.faq}
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
							href="https://x.com/cushlabsai"
							target="_blank"
							rel="noopener noreferrer"
							className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-brand-cielito hover:bg-brand-cielito/10 transition-all"
							aria-label="X (Twitter)"
						>
							<span className="text-xs">X</span>
						</a>
						<a
							href="https://linkedin.com/company/cushlabs"
							target="_blank"
							rel="noopener noreferrer"
							className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-brand-cielito hover:bg-brand-cielito/10 transition-all"
							aria-label="LinkedIn"
						>
							<span className="text-xs">in</span>
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
