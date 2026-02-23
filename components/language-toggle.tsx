"use client";

import type { Language } from "@/lib/i18n/use-language";

interface LanguageToggleProps {
	lang: Language;
	onChange: (lang: Language) => void;
}

export function LanguageToggle({ lang, onChange }: LanguageToggleProps) {
	return (
		<button
			type="button"
			onClick={() => onChange(lang === "en" ? "es" : "en")}
			className="relative flex items-center w-16 h-8 rounded-full bg-ink/10 dark:bg-white/10 p-1 transition-colors hover:bg-ink/20 dark:hover:bg-white/20"
			aria-label={`Switch to ${lang === "en" ? "Spanish" : "English"}`}
		>
			{/* Sliding pill indicator */}
			<span
				className={`absolute w-7 h-6 rounded-full bg-brand-terracotta shadow-sm transition-transform duration-200 ease-in-out ${
					lang === "es" ? "translate-x-7" : "translate-x-0"
				}`}
			/>
			{/* Labels */}
			<span
				className={`relative z-10 w-7 text-center text-xs font-bold transition-colors ${
					lang === "en" ? "text-white" : "text-ink/60 dark:text-white/60"
				}`}
			>
				EN
			</span>
			<span
				className={`relative z-10 w-7 text-center text-xs font-bold transition-colors ${
					lang === "es" ? "text-white" : "text-ink/60 dark:text-white/60"
				}`}
			>
				ES
			</span>
		</button>
	);
}
