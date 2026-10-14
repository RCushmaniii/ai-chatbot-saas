import assert from "node:assert/strict";
import { describe, test } from "node:test";
import vm from "node:vm";
import {
	clampNumber,
	isAllowedImageUrl,
	isHexColor,
	SANITIZERS_JS,
	safePosition,
} from "@/lib/embed/sanitize";

const BLOB = "https://abc123.public.blob.vercel-storage.com";

const COLORS: Array<[unknown, boolean]> = [
	["#abc", true],
	["#AABBCC", true],
	["#1c4992", true],
	["red;background:url(x)", false],
	["#abc;background:url(x)", false],
	["#aabbcc ", false],
	[" #aabbcc", false],
	["#abcd", false],
	["#aabbccdd", false],
	["red", false],
	["rgb(0,0,0)", false],
	["", false],
	[null, false],
	[123, false],
];

const IMAGES: Array<[unknown, boolean]> = [
	[`${BLOB}/avatar.png`, true],
	[`${BLOB}/a/b/c.webp?v=2`, true],
	[`${BLOB}/a.png" onerror="alert(1)`, false],
	[`${BLOB}/a.png' onerror='alert(1)`, false],
	[`${BLOB}/a.png"><script>alert(1)</script>`, false],
	["javascript:alert(1)", false],
	["data:image/svg+xml,<svg onload=alert(1)>", false],
	["http://abc123.public.blob.vercel-storage.com/a.png", false],
	["https://evil.example/a.png", false],
	["https://public.blob.vercel-storage.com.evil.example/a.png", false],
	["https://public.blob.vercel-storage.com/a.png", false],
	["https://user:pw@abc123.public.blob.vercel-storage.com/a.png", false],
	["https://abc123.public.blob.vercel-storage.com:8443/a.png", false],
	["//abc123.public.blob.vercel-storage.com/a.png", false],
	["", false],
	[undefined, false],
];

describe("hex colors", () => {
	for (const [input, expected] of COLORS) {
		test(`${JSON.stringify(input)} → ${expected}`, () => {
			assert.equal(isHexColor(input), expected);
		});
	}
});

describe("image URLs: https, our Blob store only", () => {
	for (const [input, expected] of IMAGES) {
		test(`${JSON.stringify(input)} → ${expected}`, () => {
			assert.equal(isAllowedImageUrl(input), expected);
		});
	}
});

describe("position and numbers", () => {
	test("anything but bottom-left is bottom-right", () => {
		assert.equal(safePosition("bottom-left"), "bottom-left");
		assert.equal(safePosition("top:0;left:0"), "bottom-right");
		assert.equal(safePosition(null), "bottom-right");
	});
	test("numbers are clamped and never NaN", () => {
		assert.equal(clampNumber("1.5", 0.5, 2, 1), 1.5);
		assert.equal(clampNumber("99", 0.5, 2, 1), 2);
		assert.equal(clampNumber("1);background:url(x", 0.5, 2, 1), 1);
		assert.equal(clampNumber("abc", 0.5, 2, 1), 1);
		assert.equal(clampNumber(null, 0, 60_000, 5000), 5000);
	});
});

/**
 * The served embed script carries its own copy of these rules (it runs on the
 * customer's page, not ours). This proves both copies give the same answer for
 * every hostile input above, so the browser cannot be looser than the server.
 */
describe("embed-script copy agrees with the server copy", () => {
	const sandbox: Record<string, unknown> = { URL };
	vm.runInNewContext(
		`${SANITIZERS_JS}; this.fns = { isHexColor, isAllowedImageUrl, safePosition, clampNumber };`,
		sandbox,
	);
	const browser = sandbox.fns as {
		isHexColor: (v: unknown) => boolean;
		isAllowedImageUrl: (v: unknown) => boolean;
		safePosition: (v: unknown) => string;
	};

	for (const [input] of COLORS) {
		test(`color ${JSON.stringify(input)}`, () => {
			assert.equal(browser.isHexColor(input), isHexColor(input));
		});
	}
	for (const [input] of IMAGES) {
		test(`image ${JSON.stringify(input)}`, () => {
			assert.equal(browser.isAllowedImageUrl(input), isAllowedImageUrl(input));
		});
	}
	test("position", () => {
		for (const v of ["bottom-left", "bottom-right", "top:0", null]) {
			assert.equal(browser.safePosition(v), safePosition(v));
		}
	});
});
