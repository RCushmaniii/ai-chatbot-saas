import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveEmbedTenant } from "@/lib/embed/tenant";

const ENV = {
	DEFAULT_BUSINESS_ID: "c051ab50-0000-4000-a000-000000000002\n",
	DEFAULT_BOT_ID: "c051ab50-0000-4000-a000-000000000003",
};
const OTHER_TENANT = "00000000-0000-4000-a000-0000000000bb";

/**
 * Cross-tenant scenario: a visitor on tenant A's widget names tenant B's id.
 * Before 2026-10-14 the chat route took the body's id first and answered as B.
 */
describe("a widget request is answered as this deployment's business", () => {
	test("no id in the body → the deployment's business (env trimmed)", () => {
		assert.deepEqual(resolveEmbedTenant({}, ENV), {
			ok: true,
			businessId: "c051ab50-0000-4000-a000-000000000002",
			botId: "c051ab50-0000-4000-a000-000000000003",
		});
	});

	test("the matching id (what the widget sends) is accepted", () => {
		const r = resolveEmbedTenant(
			{
				businessId: "c051ab50-0000-4000-a000-000000000002",
				botId: "c051ab50-0000-4000-a000-000000000003",
			},
			ENV,
		);
		assert.equal(r.ok, true);
	});

	test("another tenant's business id is refused, never answered as", () => {
		assert.deepEqual(resolveEmbedTenant({ businessId: OTHER_TENANT }, ENV), {
			ok: false,
			reason: "foreign-business",
		});
	});

	test("another bot id is refused", () => {
		assert.deepEqual(resolveEmbedTenant({ botId: OTHER_TENANT }, ENV), {
			ok: false,
			reason: "foreign-bot",
		});
	});

	test("a deployment with no business configured cannot be pointed at one", () => {
		assert.deepEqual(resolveEmbedTenant({ businessId: OTHER_TENANT }, {}), {
			ok: false,
			reason: "foreign-business",
		});
		assert.deepEqual(resolveEmbedTenant({}, {}), {
			ok: true,
			businessId: undefined,
			botId: undefined,
		});
	});

	test("non-string ids are treated as absent, not trusted", () => {
		const r = resolveEmbedTenant({ businessId: { $ne: null } }, ENV);
		assert.equal(r.ok && r.businessId, "c051ab50-0000-4000-a000-000000000002");
	});
});
