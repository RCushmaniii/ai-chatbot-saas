/**
 * Validators for values that end up inside a CUSTOMER'S web page.
 *
 * The embed script runs on the tenant's own site, so anything it reads — a
 * script-tag attribute, a value from /api/embed/settings, a query parameter —
 * is written into someone else's DOM. A color that is really
 * `red;background:url(https://evil/)` becomes CSS on their page; an image URL
 * carrying `" onerror="…` becomes script on their page. Every such value is
 * hostile until it passes one of these checks.
 *
 * There are TWO copies of each rule, on purpose and kept in one file:
 *
 *   - the TypeScript functions, used by server routes (admin save, settings);
 *   - SANITIZERS_JS, the same rules as plain browser JavaScript, pasted into the
 *     script that /api/embed serves.
 *
 * tests/unit/embed-sanitize.test.ts runs SANITIZERS_JS in a VM against the same
 * hostile inputs as the TypeScript and fails if the two ever disagree. Edit
 * both together or that test stops you.
 */

/** #abc or #aabbcc — nothing else, no named colors, no rgb(), no trailing text. */
export const HEX_COLOR_PATTERN = "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$";

/** Vercel Blob public hostnames: <store-id>.public.blob.vercel-storage.com */
export const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export const POSITIONS = ["bottom-right", "bottom-left"] as const;
export type WidgetPosition = (typeof POSITIONS)[number];

const hexColor = new RegExp(HEX_COLOR_PATTERN);

export function isHexColor(value: unknown): value is string {
	return typeof value === "string" && hexColor.test(value);
}

/**
 * Only https images from our own Blob store. The raw string is also refused if
 * it contains quotes, angle brackets, backslashes or whitespace: `new URL()`
 * would quietly percent-encode some of them, and a URL that needed encoding to
 * be valid was not typed by an honest admin.
 */
export function isAllowedImageUrl(value: unknown): value is string {
	if (typeof value !== "string" || value.length > 2048) return false;
	if (/["'<>\\\s`]/.test(value)) return false;
	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			url.username === "" &&
			url.password === "" &&
			url.port === "" &&
			url.hostname.endsWith(BLOB_HOST_SUFFIX) &&
			url.hostname.length > BLOB_HOST_SUFFIX.length
		);
	} catch {
		return false;
	}
}

export function safePosition(value: unknown): WidgetPosition {
	return value === "bottom-left" ? "bottom-left" : "bottom-right";
}

/** A finite number within [min, max], or the fallback. Never NaN, never CSS. */
export function clampNumber(
	value: unknown,
	min: number,
	max: number,
	fallback: number,
): number {
	const n =
		typeof value === "number" ? value : Number.parseFloat(String(value));
	if (!Number.isFinite(n)) return fallback;
	return Math.min(max, Math.max(min, n));
}

/**
 * The same four rules as browser JavaScript, for the served embed script.
 * Plain ES5-ish code: it runs on customer sites we do not control.
 */
export const SANITIZERS_JS = `
  var HEX_COLOR = new RegExp(${JSON.stringify(HEX_COLOR_PATTERN)});
  var BLOB_HOST_SUFFIX = ${JSON.stringify(BLOB_HOST_SUFFIX)};
  function isHexColor(v) { return typeof v === 'string' && HEX_COLOR.test(v); }
  function isAllowedImageUrl(v) {
    if (typeof v !== 'string' || v.length > 2048) return false;
    if (/["'<>\\\\\\s\`]/.test(v)) return false;
    try {
      var u = new URL(v);
      return u.protocol === 'https:' && u.username === '' && u.password === '' &&
        u.port === '' && u.hostname.slice(-BLOB_HOST_SUFFIX.length) === BLOB_HOST_SUFFIX &&
        u.hostname.length > BLOB_HOST_SUFFIX.length;
    } catch (e) { return false; }
  }
  function safePosition(v) { return v === 'bottom-left' ? 'bottom-left' : 'bottom-right'; }
  function clampNumber(v, min, max, fallback) {
    var n = typeof v === 'number' ? v : parseFloat(String(v));
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
`;
