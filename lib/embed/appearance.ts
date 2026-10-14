import { isAllowedImageUrl, isHexColor } from "@/lib/embed/sanitize";

/**
 * How the chat window looks, resolved from what the owner saved.
 *
 * The defaults ARE the look every tenant had before the appearance editor
 * existed (white header, pale blue circle behind the icon, no ring), so nothing
 * changes on a customer's site until the owner changes it.
 *
 * Every saved value is re-checked here even though the admin route validates on
 * save: this runs on rows that predate validation, and a value that fails is
 * replaced by the default, never "fixed up".
 */

/** What the owner can save. Every field is optional: absent means "default". */
export interface SavedAppearance {
	headerColor?: string;
	/** Absent means "same as the header" once a header color is saved. */
	avatarBackground?: string;
	/** Absent means no ring. */
	avatarRing?: string;
	/** Absent means the standard icon. Our own Blob store only. */
	avatarUrl?: string;
	/** The round button that opens the chat (only when our loader draws it). */
	buttonColor?: string;
	/** "bottom-right" | "bottom-left"; anything else is ignored. */
	position?: string;
}

export interface ResolvedAppearance {
	headerColor: string;
	headerText: string;
	avatarBackground: string;
	avatarRing: string | null;
	avatarUrl: string | null;
}

export const DEFAULT_HEADER_COLOR = "#ffffff";
/** Tailwind blue-100, the circle the widget always had. */
export const DEFAULT_AVATAR_BACKGROUND = "#dbeafe";
export const DEFAULT_BUTTON_COLOR = "#4f46e5";

/** Swatches offered to every owner, beside the ones taken from their avatar. */
export const POPULAR_SWATCHES = [
	"#ffffff",
	"#111827",
	"#1c4992",
	"#2563eb",
	"#4f46e5",
	"#0d9488",
	"#16a34a",
	"#ca8a04",
	"#ea580c",
	"#FF6A3D",
	"#dc2626",
] as const;

export function resolveAppearance(
	saved: SavedAppearance | null | undefined,
): ResolvedAppearance {
	const header = isHexColor(saved?.headerColor) ? saved.headerColor : null;
	const headerColor = header ?? DEFAULT_HEADER_COLOR;
	const avatarBackground = isHexColor(saved?.avatarBackground)
		? saved.avatarBackground
		: // The lesson-5 rule: the circle follows the header color. Before any
			// header color is saved, keep the circle tenants have always had.
			(header ?? DEFAULT_AVATAR_BACKGROUND);
	return {
		headerColor,
		headerText: readableTextColor(headerColor),
		avatarBackground,
		avatarRing: isHexColor(saved?.avatarRing) ? saved.avatarRing : null,
		avatarUrl: isAllowedImageUrl(saved?.avatarUrl) ? saved.avatarUrl : null,
	};
}

/** Expands #abc to #aabbcc. Assumes a valid hex color. */
function toSixDigits(hex: string): string {
	return hex.length === 4
		? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
		: hex;
}

/** WCAG relative luminance of a valid hex color. */
export function luminance(hex: string): number {
	const six = toSixDigits(hex);
	const channel = (i: number) => {
		const c = Number.parseInt(six.slice(i, i + 2), 16) / 255;
		return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * Dark text on a light header, white text on a dark one, whichever has the
 * higher contrast. An owner who picks a dark brand color never ends up with a
 * title nobody can read, and never has to pick a text color.
 */
export function readableTextColor(hex: string): string {
	if (!isHexColor(hex)) return "#111827";
	const l = luminance(hex);
	const onDark = 1.05 / (l + 0.05);
	const onLight = (l + 0.05) / (luminance("#111827") + 0.05);
	return onDark >= onLight ? "#ffffff" : "#111827";
}
