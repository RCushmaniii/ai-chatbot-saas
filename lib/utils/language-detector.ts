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
 * Translate URL from /en/ to /es/ or vice versa
 */
export function translateUrl(url: string, targetLang: "en" | "es"): string {
	if (!url) return url;

	if (targetLang === "es") {
		// Replace /en/ with /es/
		return url.replace(/\/en\//g, "/es/");
	} else {
		// Replace /es/ with /en/
		return url.replace(/\/es\//g, "/en/");
	}
}

/**
 * Get localized "Learn more" text
 */
export function getLearnMoreText(lang: "en" | "es"): string {
	return lang === "es" ? "Más información:" : "Learn more:";
}
