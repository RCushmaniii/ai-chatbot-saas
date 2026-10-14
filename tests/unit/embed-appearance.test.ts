import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DEFAULT_AVATAR_BACKGROUND,
	DEFAULT_HEADER_COLOR,
	readableTextColor,
	resolveAppearance,
} from "@/lib/embed/appearance";
import { detectImageType } from "@/lib/embed/image-type";
import {
	adminSettingsSchema,
	mergeEmbedSettings,
} from "@/lib/embed/settings-schema";

const BLOB =
	"https://abc123.public.blob.vercel-storage.com/widget-avatars/a.png";
const HOSTILE_COLOR = "red;background:url(x)";
const HOSTILE_URL =
	'https://abc123.public.blob.vercel-storage.com/a.png" onerror="alert(1)';

describe("appearance defaults keep today's look (lesson 5)", () => {
	test("nothing saved = white header, pale blue circle, no ring, standard icon", () => {
		assert.deepEqual(resolveAppearance(null), {
			headerColor: DEFAULT_HEADER_COLOR,
			headerText: "#111827",
			avatarBackground: DEFAULT_AVATAR_BACKGROUND,
			avatarRing: null,
			avatarUrl: null,
		});
	});

	test("the circle behind the avatar follows a saved header color", () => {
		const a = resolveAppearance({ headerColor: "#1c4992" });
		assert.equal(a.avatarBackground, "#1c4992");
		assert.equal(a.headerText, "#ffffff");
	});

	test("an explicit avatar background and ring win", () => {
		const a = resolveAppearance({
			headerColor: "#1c4992",
			avatarBackground: "#ffffff",
			avatarRing: "#FF6A3D",
			avatarUrl: BLOB,
		});
		assert.equal(a.avatarBackground, "#ffffff");
		assert.equal(a.avatarRing, "#FF6A3D");
		assert.equal(a.avatarUrl, BLOB);
	});

	test("hostile stored values fall back to the defaults (lesson 4)", () => {
		assert.deepEqual(
			resolveAppearance({
				headerColor: HOSTILE_COLOR,
				avatarBackground: HOSTILE_COLOR,
				avatarRing: "url(javascript:alert(1))",
				avatarUrl: HOSTILE_URL,
			}),
			resolveAppearance(null),
		);
		assert.equal(
			resolveAppearance({ avatarUrl: "https://evil.example/a.png" }).avatarUrl,
			null,
		);
		assert.equal(
			resolveAppearance({
				avatarUrl: "http://abc.public.blob.vercel-storage.com/a.png",
			}).avatarUrl,
			null,
		);
	});

	test("the title is readable on any header", () => {
		assert.equal(readableTextColor("#ffffff"), "#111827");
		assert.equal(readableTextColor("#fde047"), "#111827");
		assert.equal(readableTextColor("#111827"), "#ffffff");
		assert.equal(readableTextColor("#1c4992"), "#ffffff");
		assert.equal(readableTextColor(HOSTILE_COLOR), "#111827");
	});
});

describe("admin save validation (lesson 4)", () => {
	const parse = (embedSettings: unknown) =>
		adminSettingsSchema.safeParse({ embedSettings });

	test("hostile colors are refused", () => {
		for (const key of [
			"headerColor",
			"avatarBackground",
			"avatarRing",
			"buttonColor",
		]) {
			assert.equal(parse({ [key]: HOSTILE_COLOR }).success, false, key);
		}
	});

	test("an image URL with a quote and onerror is refused, as is any non-Blob URL", () => {
		assert.equal(parse({ avatarUrl: HOSTILE_URL }).success, false);
		assert.equal(
			parse({ avatarUrl: "https://evil.example/a.png" }).success,
			false,
		);
		assert.equal(parse({ avatarUrl: "javascript:alert(1)" }).success, false);
	});

	test("valid values and null (clear) are accepted", () => {
		const ok = parse({
			headerColor: "#1c4992",
			avatarRing: null,
			avatarUrl: BLOB,
			position: "bottom-left",
			welcomeMessage_es: "¡Hola!",
		});
		assert.equal(ok.success, true);
	});

	test("an unknown position is refused", () => {
		assert.equal(parse({ position: "top:0;left:0" }).success, false);
	});
});

describe("saving merges into what is stored", () => {
	test("null clears, a value replaces, absent keys and unknown keys stay", () => {
		assert.deepEqual(
			mergeEmbedSettings(
				{ botIcon: "🎓", headerColor: "#000000", avatarRing: "#ffffff" },
				{ headerColor: "#1c4992", avatarRing: null },
			),
			{ botIcon: "🎓", headerColor: "#1c4992" },
		);
	});
});

describe("avatar uploads are typed by their bytes", () => {
	const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
	const webp = new Uint8Array([
		0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
	]);
	const svg = new TextEncoder().encode('<svg onload="alert(1)"></svg>');

	test("PNG, JPEG and WebP are recognised", () => {
		assert.equal(detectImageType(png)?.type, "image/png");
		assert.equal(detectImageType(jpg)?.type, "image/jpeg");
		assert.equal(detectImageType(webp)?.type, "image/webp");
	});

	test("SVG and anything else are refused", () => {
		assert.equal(detectImageType(svg), null);
		assert.equal(detectImageType(new Uint8Array([1, 2, 3])), null);
	});
});
