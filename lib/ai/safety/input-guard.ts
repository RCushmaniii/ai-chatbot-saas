/**
 * Input prompt-injection guard.
 *
 * Pattern-matches user messages against known prompt-injection vectors.
 * The list is defense-in-depth: it won't catch every novel attack but it
 * catches the high-frequency baseline (DAN, role-override, system markers,
 * "ignore previous instructions"). Any pass the model itself is the second
 * line of defense via input sanitization in the system prompt.
 *
 * Patterns are tuned for English and Spanish since the platform is bilingual.
 */

const INJECTION_PATTERNS: readonly RegExp[] = [
	// "Ignore previous/prior/all/above instructions"
	/ignore\s+(all\s+|the\s+|your\s+|previous\s+|prior\s+|above\s+)+(instructions?|prompts?|rules?|directives?)/i,
	/disregard\s+(all\s+|the\s+|your\s+|previous\s+|prior\s+|above\s+)+(instructions?|prompts?|rules?)/i,
	/forget\s+(all\s+|the\s+|your\s+|previous\s+|everything\s+|above\s+)+(instructions?|told|said)/i,
	// Spanish equivalents
	/ignora\s+(todas\s+|las\s+|tus\s+|previas\s+|anteriores\s+)+(instrucciones?|reglas?|directivas?)/i,
	/olvida\s+(todas\s+|las\s+|tus\s+|previas\s+|anteriores\s+)+(instrucciones?|reglas?)/i,

	// "You are now / from now on / act as / pretend"
	/\byou\s+are\s+now\b/i,
	/\bfrom\s+now\s+on\b.*\b(you|act|behave|respond)\b/i,
	/\bact\s+as\s+(if\s+)?(a|an|the)?\s*(?:dan|jailbroken|unfiltered|uncensored)/i,
	/\bpretend\s+(to\s+be|you('?re|\s+are))\b/i,
	/\bahora\s+eres\b/i,
	/\bact[uú]a\s+como\b/i,

	// Mode-switch attacks
	/\b(developer|admin|sudo|debug|jailbreak|jailbroken|unrestricted)\s+mode\b/i,
	/\bdo\s+anything\s+now\b/i,
	/\bDAN\s+(mode|prompt|jailbreak)/i,
	/\bevil\s+(twin|version|mode)/i,

	// System / instruction reveal
	/(reveal|show|print|output|repeat|tell me)\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?|directives?)/i,
	/what\s+(are|were)\s+(your|the)\s+(system\s+)?(instructions?|prompt|rules)/i,
	/(repite|muestra|imprime|d[ií]me)\s+(tu|el)\s+(prompt|instrucciones?|reglas?)/i,

	// Structural injection / role tag spoofing
	/\[\s*(system|assistant|user|developer|instructions?)\s*\]/i,
	/<\s*\/?\s*(system|assistant|user|developer|instructions?)\s*>/i,
	/^---+\s*(system|begin|new instructions?)/im,
	/\bBEGIN\s+(SYSTEM|NEW\s+INSTRUCTIONS?)\b/,
	/\bEND\s+(SYSTEM|INSTRUCTIONS?)\b/,

	// Override directives
	/\boverride\s+(your|the|all)\s+(safety|security|content|guard)/i,
	/\bbypass\s+(your|the|all|all\s+the)\s+(safety|security|content|filter|guard|restriction)/i,

	// Prompt-leak via continuation tricks
	/^repeat the (text|words|content) above/i,
	/^print (everything|the entire prompt|all instructions)/i,
];

export interface InputGuardResult {
	ok: boolean;
	reason?: "injection" | "too_long";
	pattern?: string;
}

const MAX_INPUT_CHARS = 4000;

/**
 * Check a user message for prompt-injection patterns and length.
 * Returns { ok: true } if the message is safe to forward to the model.
 */
export function checkInput(input: string): InputGuardResult {
	if (typeof input !== "string") return { ok: false, reason: "injection" };

	if (input.length > MAX_INPUT_CHARS) {
		return { ok: false, reason: "too_long" };
	}

	for (const pattern of INJECTION_PATTERNS) {
		if (pattern.test(input)) {
			return {
				ok: false,
				reason: "injection",
				pattern: pattern.source.slice(0, 80),
			};
		}
	}

	return { ok: true };
}

/**
 * Bilingual rejection messages used by routes when checkInput fails.
 * Keep these neutral and friendly — many false positives are still humans.
 */
export const SAFE_REJECTION_MESSAGES = {
	injection: {
		en: "I can only help with questions about this business and its services. Could you rephrase your question?",
		es: "Solo puedo ayudarte con preguntas sobre este negocio y sus servicios. ¿Puedes reformular tu pregunta?",
	},
	too_long: {
		en: "That message is too long for me to process. Could you shorten it?",
		es: "Ese mensaje es demasiado largo para procesar. ¿Puedes acortarlo?",
	},
} as const;
