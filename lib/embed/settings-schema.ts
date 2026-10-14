import { z } from "zod";
import {
	HEX_COLOR_PATTERN,
	isAllowedImageUrl,
	POSITIONS,
} from "@/lib/embed/sanitize";

/**
 * What /api/admin/settings accepts. Everything saved here can reach a visitor's
 * browser on a customer's site, so it is validated on the way in as well as on
 * the way out: a color like "red;background:url(x)" or an image URL carrying a
 * quote and an onerror attribute is refused with a 400, not stored and dropped
 * later.
 *
 * Fields are optional because each admin screen saves only its own part
 * (starter questions; name + instructions; appearance). Unknown keys are
 * stripped.
 */
const hexColor = z.string().regex(new RegExp(HEX_COLOR_PATTERN));
const visitorText = (max: number) => z.string().trim().max(max);

/**
 * Widget appearance and text. `null` CLEARS a field (back to the default:
 * "Back to the standard avatar", "same as header", "no ring"); an absent field
 * is left as it is.
 */
export const embedSettingsSchema = z
	.object({
		headerColor: hexColor.nullable(),
		avatarBackground: hexColor.nullable(),
		avatarRing: hexColor.nullable(),
		avatarUrl: z
			.string()
			.refine(isAllowedImageUrl, "Images must be uploaded here")
			.nullable(),
		buttonColor: hexColor.nullable(),
		position: z.enum(POSITIONS).nullable(),
		welcomeMessage: visitorText(500).nullable(),
		welcomeMessage_es: visitorText(500).nullable(),
		placeholder: visitorText(120).nullable(),
		placeholder_es: visitorText(120).nullable(),
	})
	.partial();

export type EmbedSettingsPatch = z.infer<typeof embedSettingsSchema>;

export const adminSettingsSchema = z.object({
	botName: z.string().trim().max(100).optional(),
	customInstructions: z.string().max(20_000).optional(),
	starterQuestions: z
		.array(
			z.object({
				id: z.string().max(64),
				question: z.string().max(300),
				question_es: z.string().max(300).optional(),
				emoji: z.string().max(16).optional(),
			}),
		)
		.max(12)
		.optional(),
	embedSettings: embedSettingsSchema.optional(),
	settings: z
		.object({
			showTimestamps: z.boolean().optional(),
			showCitations: z.boolean().optional(),
			language: z.enum(["en", "es"]).optional(),
		})
		.optional(),
});

/**
 * Applies a patch to the stored embedSettings: null or an empty string removes
 * the key, a value replaces it, absent keys are untouched. Keys this schema
 * does not know (botIcon, older rows) are kept.
 */
export function mergeEmbedSettings(
	current: Record<string, unknown> | null | undefined,
	patch: EmbedSettingsPatch,
): Record<string, unknown> {
	const next: Record<string, unknown> = { ...(current ?? {}) };
	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) continue;
		if (value === null || value === "") delete next[key];
		else next[key] = value;
	}
	return next;
}
