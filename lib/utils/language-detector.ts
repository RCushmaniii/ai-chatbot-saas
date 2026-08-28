/**
 * Detect language from text (English or Spanish)
 * Returns 'es' for Spanish, 'en' for English
 */
export function detectLanguage(text: string): "en" | "es" {
	if (!text || text.trim().length === 0) {
		return "en"; // Default to English
	}

	const lowerText = text.toLowerCase();

	// Spanish indicators (common words and patterns)
	const spanishIndicators = [
		// Question words
		/\b(qué|cómo|cuándo|dónde|por qué|cuál|cuáles|quién|quiénes)\b/,
		// Common verbs
		/\b(puedo|puedes|puede|podemos|pueden|quiero|quieres|quiere|queremos|quieren)\b/,
		/\b(necesito|necesitas|necesita|necesitamos|necesitan)\b/,
		/\b(tengo|tienes|tiene|tenemos|tienen)\b/,
		/\b(estoy|estás|está|estamos|están)\b/,
		/\b(soy|eres|es|somos|son)\b/,
		// Common words
		/\b(hola|gracias|por favor|ayuda|información|servicio|servicios)\b/,
		/\b(precio|precios|costo|costos|cuánto|cuánta)\b/,
		/\b(clase|clases|sesión|sesiones|consulta)\b/,
		// Accented characters
		/[áéíóúñü]/,
		// Spanish articles and prepositions
		/\b(el|la|los|las|un|una|unos|unas|del|al)\b/,
		/\b(para|con|sin|sobre|entre|desde|hasta)\b/,
	];

	// Count Spanish indicators
	let spanishScore = 0;
	for (const pattern of spanishIndicators) {
		if (pattern.test(lowerText)) {
			spanishScore++;
		}
	}

	// If we find 2+ Spanish indicators, it's likely Spanish
	return spanishScore >= 2 ? "es" : "en";
}

/**
 * Sites that put the default locale at the ROOT rather than behind an /en/
 * prefix, keyed by hostname suffix, with the slug pairs where the two languages
 * do not share a path.
 *
 * cushlabs.ai is `prefixDefaultLocale: false`: English lives at /pricing/ and
 * Spanish at /es/precios/. There is no /en/ route at all, so the plain
 * `/es/` → `/en/` swap below produced https://www.cushlabs.ai/en/precios/ —
 * a 404 handed to a prospect by the assistant whose entire pitch is that it
 * doesn't get things wrong. Found 2026-08-27.
 *
 * Key = EN path without a locale prefix, value = ES path without the /es prefix.
 * Paths that are identical in both languages need no entry.
 */
const ROOT_DEFAULT_LOCALE_SITES: Array<{
	host: string;
	slugPairs: Record<string, string>;
}> = [
	{
		host: "cushlabs.ai",
		// Mirrors cushlabs/src/i18n/index.ts → routePairs. Keep the two in step.
		slugPairs: {
			"/pricing": "/precios",
			"/consultation": "/reservar",
		},
	},
];

/** Preserve a trailing slash, which cushlabs.ai canonicalises on. */
function withTrailingSlashLike(path: string, original: string): string {
	if (path === "/") return path;
	const wantsSlash = original.endsWith("/");
	const bare = path.replace(/\/$/, "");
	return wantsSlash ? `${bare}/` : bare;
}

/**
 * Translate a knowledge-base URL into the language the visitor is writing in.
 *
 * Two URL schemes are supported:
 *   - prefixed default locale (`/en/x` ↔ `/es/x`) — the original behaviour, and
 *     still what non-registered hosts get;
 *   - root default locale (`/x` ↔ `/es/x`, with per-site slug pairs) — used by
 *     the sites listed in ROOT_DEFAULT_LOCALE_SITES.
 *
 * A URL already in the target language is returned untouched.
 */
export function translateUrl(url: string, targetLang: "en" | "es"): string {
	if (!url) return url;

	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		// Not an absolute URL — fall back to the original prefix swap.
		return targetLang === "es"
			? url.replace(/\/en\//g, "/es/")
			: url.replace(/\/es\//g, "/en/");
	}

	const site = ROOT_DEFAULT_LOCALE_SITES.find(
		(s) => parsed.hostname === s.host || parsed.hostname.endsWith(`.${s.host}`),
	);

	if (!site) {
		return targetLang === "es"
			? url.replace(/\/en\//g, "/es/")
			: url.replace(/\/es\//g, "/en/");
	}

	const path = parsed.pathname;
	const isEs = path === "/es" || path.startsWith("/es/");

	// Already in the requested language.
	if ((targetLang === "es") === isEs) return url;

	let next: string;

	if (targetLang === "es") {
		const bare = path.replace(/\/$/, "") || "/";
		const mapped = site.slugPairs[bare] ?? (bare === "/" ? "" : bare);
		next = `/es${mapped}` || "/es";
	} else {
		const bare = path.replace(/^\/es/, "").replace(/\/$/, "") || "/";
		const reversed = Object.entries(site.slugPairs).find(
			([, es]) => es === bare,
		)?.[0];
		next = reversed ?? bare;
	}

	parsed.pathname = withTrailingSlashLike(next || "/", path);
	return parsed.toString();
}

/**
 * Get localized "Learn more" text
 */
export function getLearnMoreText(lang: "en" | "es"): string {
	return lang === "es" ? "Más información:" : "Learn more:";
}
