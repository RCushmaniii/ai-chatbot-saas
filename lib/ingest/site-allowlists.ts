/**
 * Website sources that index a FIXED LIST of pages instead of their sitemap.
 *
 * WHY A LIST, NOT THE SITEMAP
 *
 * The CushLabs tenant's website source used to index all 133 sitemap URLs of
 * cushlabs.ai — 753 chunks, blog included. A blog post is a dated snapshot: it
 * says what was true the week it was written and is never revised, so it keeps
 * asserting "coming soon" long after a feature ships. The assistant cannot tell
 * a 2026-06 post from the 2026-10 pricing page, and with only five chunks of
 * context per answer, one stale post outranking the FAQ is enough to tell a
 * prospect something false. The pages below are the ones CushLabs keeps current
 * on purpose: pricing, FAQ, services, about, terms — EN and ES.
 *
 * Keyed by business id, then by the source's base URL (ContentSource.name), so
 * an entry can only ever affect that one tenant's one source. A source with no
 * entry here keeps the original sitemap behaviour.
 *
 * Adding a page: add BOTH language versions. The next daily retrain picks it up;
 * removing one deletes its chunks on that run.
 *
 * This lives in code rather than a column because adding a column is a schema
 * migration, and this is one tenant's configuration on a single-tenant
 * deployment. When a second tenant needs an allowlist, move it to
 * ContentSource.
 */

const CUSHLABS_BUSINESS_ID = "c051ab50-0000-4000-a000-000000000002";
const CUSHLABS = "https://www.cushlabs.ai";

const cushlabsPages = [
	["/pricing/", "/es/precios/"],
	["/faq/", "/es/faq/"],
	["/services/", "/es/services/"],
	["/services/premium/", "/es/services/premium/"],
	["/services/messenger-assistant/", "/es/services/messenger-assistant/"],
	["/services/instagram/", "/es/services/instagram/"],
	["/services/whatsapp/", "/es/services/whatsapp/"],
	["/services/website-chatbot/", "/es/services/website-chatbot/"],
	["/services/voice-agent/", "/es/services/voice-agent/"],
	[
		"/services/competitive-intelligence/",
		"/es/services/competitive-intelligence/",
	],
	["/about/", "/es/about/"],
	["/terms/", "/es/terms/"],
].flat();

export const SOURCE_PAGE_ALLOWLISTS: Readonly<
	Record<string, Readonly<Record<string, readonly string[]>>>
> = {
	[CUSHLABS_BUSINESS_ID]: {
		[CUSHLABS]: cushlabsPages.map((p) => `${CUSHLABS}${p}`),
	},
};

/** The fixed page list for a website source, or null to use its sitemap. */
export function allowlistFor(
	businessId: string,
	sourceBaseUrl: string,
): readonly string[] | null {
	const base = sourceBaseUrl.replace(/\/+$/, "");
	return SOURCE_PAGE_ALLOWLISTS[businessId]?.[base] ?? null;
}
