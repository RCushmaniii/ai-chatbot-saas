import assert from "node:assert/strict";
import { describe, test } from "node:test";
import vm from "node:vm";
import { GET } from "@/app/api/embed/route";
import { buildEmbedScript } from "@/lib/embed/script";

describe("the served embed script", () => {
	test("is valid JavaScript", () => {
		assert.doesNotThrow(
			() => new vm.Script(buildEmbedScript("https://www.soyconverso.com")),
		);
	});

	test("never parses HTML strings (no innerHTML / outerHTML / insertAdjacentHTML)", () => {
		const src = buildEmbedScript("https://www.soyconverso.com");
		assert.doesNotMatch(
			src,
			/innerHTML|outerHTML|insertAdjacentHTML|document\.write/,
		);
	});

	test("the app URL is a JSON string literal, so a quote in it cannot break out", () => {
		const src = buildEmbedScript("https://x.example/';alert(1)//");
		assert.doesNotThrow(() => new vm.Script(src));
		assert.match(
			src,
			/var CHAT_APP_URL = "https:\/\/x\.example\/';alert\(1\)\/\/";/,
		);
	});

	/**
	 * The live defect of 2026-10-14: ?id= was pasted into the source, and
	 * /api/embed?id=x';alert(1)// served `const BOT_ID = 'x';alert(1)//';`.
	 */
	test("the query string never reaches the script", async () => {
		const plain = await (await GET()).text();
		const res = await GET();
		assert.equal(await res.text(), plain);
		assert.doesNotMatch(plain, /BOT_ID|alert\(1\)/);
		assert.equal(res.headers.get("x-content-type-options"), "nosniff");
	});
});
