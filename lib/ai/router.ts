/**
 * Two-model routing for cost-efficient chat.
 *
 * Pleasantries (greetings, thanks, short affirmations) go to the cheaper
 * `chat-model-mini` (gpt-4o-mini). Anything substantive — questions,
 * requests for information, longer messages — goes to `chat-model`
 * (gpt-4o). Empirically ~30% of widget traffic is pleasantries; routing
 * them to the mini model cuts AI cost on those turns by ~10x without
 * affecting answer quality where it matters.
 *
 * Bias is toward the SAFE choice (full model). Only obvious pleasantries
 * are downgraded.
 */

const PLEASANTRY_PATTERNS: readonly RegExp[] = [
	// English greetings + farewells
	/^\s*(hi|hello|hey|yo|sup|howdy|hiya)[!.\s]*$/i,
	/^\s*good\s+(morning|afternoon|evening|night)[!.\s]*$/i,
	/^\s*(bye|goodbye|see\s+ya|see\s+you|cya|later|farewell)[!.\s]*$/i,

	// English affirmations + thanks
	/^\s*(yes|yeah|yep|yup|sure|ok|okay|kk|cool|nice|great|awesome|got\s+it)[!.\s]*$/i,
	/^\s*(thanks?|thank\s+you|thx|ty|tysm|appreciated|much\s+appreciated)[!.\s]*$/i,
	/^\s*(no|nope|nah|no\s+thanks|i'?m\s+good)[!.\s]*$/i,

	// Spanish greetings + farewells
	/^\s*(hola|buenas|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches)[!.\s]*$/i,
	/^\s*(adi[óo]s|chao|hasta\s+luego|hasta\s+pronto|nos\s+vemos)[!.\s]*$/i,

	// Spanish affirmations + thanks
	/^\s*(s[íi]|claro|por\s+supuesto|de\s+acuerdo|vale|ok)[!.\s]*$/i,
	/^\s*(gracias|muchas\s+gracias|mil\s+gracias|te\s+agradezco)[!.\s]*$/i,
	/^\s*(no|para\s+nada|gracias\s+no|no\s+gracias)[!.\s]*$/i,

	// Casual conversational fillers
	/^\s*(haha+|lol|jaja+|jiji+|hmm+|ah+|oh+|ok\s+thanks?)[!.\s]*$/i,
];

const PLEASANTRY_MAX_WORDS = 6;

export type ChatModelKey = "chat-model" | "chat-model-mini";

/**
 * Pick the right model for a single user message. Returns the key that
 * `myProvider.languageModel(...)` accepts.
 */
export function routeModel(text: string): ChatModelKey {
	if (typeof text !== "string") return "chat-model";

	const trimmed = text.trim();
	if (!trimmed) return "chat-model";

	// Anything with a question mark is treated as a real question.
	if (/[?¿]/.test(trimmed)) return "chat-model";

	// Anything substantially long → full model.
	const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
	if (wordCount > PLEASANTRY_MAX_WORDS) return "chat-model";

	for (const pattern of PLEASANTRY_PATTERNS) {
		if (pattern.test(trimmed)) return "chat-model-mini";
	}

	// Short but unrecognized — could be a quick question. Default safe.
	return "chat-model";
}
