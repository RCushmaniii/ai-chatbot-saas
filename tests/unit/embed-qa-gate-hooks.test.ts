import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isQaGateRequest } from "@/lib/embed/internal-traffic";
import { resolveModelOverride } from "@/lib/embed/model-override";
import { createTimer } from "@/lib/embed/server-timing";

const TOKEN = "t".repeat(43);
const req = (headers: Record<string, string>) =>
	new Request("https://www.soyconverso.com/api/embed/chat", { headers });

/**
 * This product bills by message count, so "internal" traffic (not counted)
 * must be impossible to claim with a header anyone can type.
 */
describe("QA gate traffic is recognised only with the token", () => {
	const env = { QA_GATE_TOKEN: TOKEN };

	test("header + matching token → internal", () => {
		assert.equal(
			isQaGateRequest(
				req({ "x-test-run": "qa-gate", "x-qa-token": TOKEN }),
				env,
			),
			true,
		);
	});
	test("header alone → a normal visitor", () => {
		assert.equal(isQaGateRequest(req({ "x-test-run": "qa-gate" }), env), false);
	});
	test("wrong token → a normal visitor", () => {
		assert.equal(
			isQaGateRequest(
				req({ "x-test-run": "qa-gate", "x-qa-token": "x".repeat(43) }),
				env,
			),
			false,
		);
	});
	test("no token configured on the server → nobody is internal", () => {
		assert.equal(
			isQaGateRequest(req({ "x-test-run": "qa-gate", "x-qa-token": "" }), {}),
			false,
		);
	});
});

describe("--model is honoured only outside production", () => {
	test("local dev: a listed model is used", () => {
		assert.equal(
			resolveModelOverride(req({ "x-chat-model": "gpt-4.1-mini" }), {}),
			"gpt-4.1-mini",
		);
	});
	test("production: ignored", () => {
		assert.equal(
			resolveModelOverride(req({ "x-chat-model": "gpt-4.1-mini" }), {
				VERCEL_ENV: "production",
			}),
			null,
		);
	});
	test("unknown model id: ignored", () => {
		assert.equal(
			resolveModelOverride(req({ "x-chat-model": "o3-pro" }), {}),
			null,
		);
	});
});

describe("Server-Timing header", () => {
	test("records named durations, never values", async () => {
		const t = createTimer();
		await t.time("persona", async () => "secret persona text");
		t.add("embed", 12.345);
		t.mark("pre");
		const h = t.header();
		assert.match(h, /^persona;dur=\d+\.\d, embed;dur=12\.3, pre;dur=\d+\.\d$/);
		assert.doesNotMatch(h, /secret/);
	});
});
