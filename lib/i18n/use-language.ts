"use client";

import { useCallback, useEffect, useState } from "react";
import {
	type Language,
	type TranslationKeys,
	translations,
} from "./translations";

const STORAGE_KEY = "converso-lang";
const COOKIE_KEY = "converso-lang";

function getBrowserLanguage(): Language {
	if (typeof window === "undefined") return "es";
	const browserLang = navigator.language || "";
	return browserLang.startsWith("es") ? "es" : "en";
}

function getStoredLanguage(): Language | null {
	if (typeof window === "undefined") return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "en" || stored === "es") return stored;
	return null;
}

function getCookieLanguage(): Language | null {
	if (typeof document === "undefined") return null;
	const match = document.cookie.match(new RegExp(`(^| )${COOKIE_KEY}=([^;]+)`));
	if (match) {
		const value = match[2];
		if (value === "en" || value === "es") return value;
	}
	return null;
}

function setCookie(name: string, value: string, days: number) {
	const expires = new Date();
	expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
	// biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
	document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export function useLanguage() {
	// Default to Spanish for SSR (majority market)
	const [lang, setLangState] = useState<Language>("es");
	const [isHydrated, setIsHydrated] = useState(false);

	// On mount, detect the actual language preference
	useEffect(() => {
		const stored = getStoredLanguage() ?? getCookieLanguage();
		const detected = stored ?? getBrowserLanguage();
		setLangState(detected);
		setIsHydrated(true);
		// Ensure cookie is set for server-side reading (Clerk localization)
		setCookie(COOKIE_KEY, detected, 365);
	}, []);

	const setLang = useCallback((newLang: Language) => {
		setLangState(newLang);
		localStorage.setItem(STORAGE_KEY, newLang);
		// Also set cookie so server can read it (for Clerk localization)
		setCookie(COOKIE_KEY, newLang, 365);
		// Force page reload to update Clerk localization (server component)
		window.location.reload();
	}, []);

	// Translation getter - returns the translation object for current language
	const t = translations[lang];

	return {
		lang,
		setLang,
		t,
		isHydrated,
	};
}

export type { Language, TranslationKeys };
