import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "node:test";
import { buildInstallCode } from "@/components/admin-embed-code";

/**
 * Lesson 1 of the 2026-10-14 audit: appearance and text attributes on the
 * widget's script tag override nothing any more (saved settings win), but a
 * tag that carries them still teaches the wrong install and hides what the
 * owner saved whenever the settings endpoint is unreachable. On ny-ai-chatbot a
 * demo page's data-button-color made every saved color look like a broken
 * save.
 *
 * This scans every page, component and doc that loads the widget and fails on
 * any attribute beyond loading and language.
 */
// Tests run from the repo root (pnpm test:unit).
const ROOT = process.cwd();
const SCAN = ["app", "components", "docs"];
const ROOT_DOCS = ["README.md", "CONVERSO_BUILD_SPEC.md"];
const ALLOWED = new Set([
	"src",
	"async",
	"defer",
	"id",
	"strategy",
	"type",
	"key",
	"data-language",
	"language",
]);

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (name === "node_modules" || name.startsWith(".")) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else if (/\.(tsx?|md|html)$/.test(name)) out.push(path);
	}
	return out;
}

/** Every <script …> / <Script …> tag that loads /api/embed. */
function embedTags(source: string): string[] {
	return [
		...source.matchAll(/<(?:script|Script)\b[^>]*?\/api\/embed\b[^>]*>/g),
	].map((m) => m[0]);
}

function attributeNames(tag: string): string[] {
	const names: string[] = [];
	const body = tag.replace(/^<\w+/, "").replace(/\/?>$/, "");
	for (const m of body.matchAll(
		/([A-Za-z][\w-]*)\s*(=\s*("[^"]*"|'[^']*'|\{[^}]*\}|`[^`]*`|\S+))?/g,
	)) {
		names.push(m[1]);
	}
	return names;
}

describe("widget installs carry no appearance attributes (lesson 1)", () => {
	const files = [
		...SCAN.flatMap((d) => walk(join(ROOT, d))),
		...ROOT_DOCS.map((f) => join(ROOT, f)),
	];

	test("the scan finds the demo page's tag (so it is really looking)", () => {
		const demo = readFileSync(
			join(ROOT, "app", "demo-ny-english", "page.tsx"),
			"utf8",
		);
		assert.equal(embedTags(demo).length, 1);
	});

	for (const file of files) {
		let source: string;
		try {
			source = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const tags = embedTags(source);
		if (tags.length === 0) continue;
		test(relative(ROOT, file), () => {
			for (const tag of tags) {
				const extra = attributeNames(tag).filter((n) => !ALLOWED.has(n));
				assert.deepEqual(
					extra,
					[],
					`${relative(ROOT, file)} loads the widget with ${extra.join(", ")}. Set appearance and text in the admin's Widget tab instead.`,
				);
			}
		});
	}

	test("the admin's install code is the bare script tag", () => {
		const code = buildInstallCode("https://www.soyconverso.com");
		assert.equal(
			code,
			'<script async src="https://www.soyconverso.com/api/embed"></script>',
		);
	});

	test("a reintroduced attribute is caught", () => {
		const bad =
			'<Script src="/api/embed" data-language="en" data-button-color="#1c4992" />';
		const extra = attributeNames(embedTags(bad)[0]).filter(
			(n) => !ALLOWED.has(n),
		);
		assert.deepEqual(extra, ["data-button-color"]);
	});
});
