import type { translations } from "@/lib/i18n/translations";

// Use a mapped type that extracts just the keys with string values,
// making English and Spanish structurally compatible
export type OnboardingStrings = {
	[K in keyof (typeof translations)["en"]["onboarding"]]: string;
};
