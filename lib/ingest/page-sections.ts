import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

/** A parsed DOM node; narrowed to `El` where its shape matters (no direct domhandler dependency). */
type AnyNode = object;

/**
 * Turn one HTML page into retrieval-ready chunks, one per heading section, once
 * per MARKET when the page prints two currencies.
 *
 * WHY NOT `scrapePage()` + `chunkContent()` FROM ./site
 *
 * Those flatten the whole page with `.text().replace(/\s+/g, " ")`. Measured on
 * cushlabs.ai on 2026-10-08, that does three things a sales assistant cannot
 * survive:
 *
 *   1. BOTH CURRENCIES IN ONE SENTENCE. /pricing/ renders every price twice —
 *      `<span data-cur="mxn">$3,490</span><span data-cur="usd" class="hidden">$229</span>`
 *      — and a script shows one. Flattened text reads "$3,490$229 MXN/mo + IVAUSD/mo",
 *      and the model is left to guess which number belongs to which market. The
 *      persona's first pricing rule is "never convert one to the other"; handing
 *      it a fused string invites exactly that.
 *   2. NO WORD BOUNDARIES between block elements: "<li>Messenger</li><li>Website</li>"
 *      becomes "MessengerWebsite", which neither embeds nor reads well.
 *   3. QUESTIONS SEPARATED FROM THEIR ANSWERS. A fixed 1,000-character window
 *      cuts an FAQ item wherever it lands. The provisioning script measured why
 *      that matters: a visitor's short question scores 0.37 against prose and
 *      0.46+ against text that contains the question. A chunk that STARTS with
 *      the FAQ question it answers is the cheapest retrieval win available.
 *
 * So: walk the DOM, break lines at block elements, split at headings (and at
 * <summary>, which is how accordion FAQs mark a question), and prefix every
 * chunk with page title + heading path + market. Each chunk is self-sufficient,
 * because retrieval returns chunks, not pages.
 */

export type Market = "mx" | "us";

export type PageVariant = {
	/** null when the page has no currency-specific content. */
	market: Market | null;
	label: string | null;
};

export type SectionChunk = {
	/** What the model reads AND what is embedded. */
	content: string;
	/** Full heading path, " > "-joined. */
	heading: string;
	/** The nearest heading alone (the page's name when there is none) — what a visitor's question looks like. */
	leaf: string;
	market: Market | null;
};

/** Upper bound on one chunk's body. Sections longer than this are split on lines. */
const MAX_CHUNK_CHARS = 1400;
/** Sections shorter than this are merged into the following one. */
const MIN_SECTION_CHARS = 40;

const MARKET_LABEL: Record<"en" | "es", Record<Market, string>> = {
	en: {
		mx: "Prices for clients in Mexico (MXN, plus IVA)",
		us: "Prices for clients in the US and outside Mexico (USD)",
	},
	es: {
		mx: "Precios para clientes en México (MXN, más IVA)",
		us: "Precios para clientes en EE. UU. y fuera de México (USD)",
	},
};

const BLOCK_TAGS = new Set([
	"address",
	"article",
	"aside",
	"blockquote",
	"br",
	"dd",
	"details",
	"div",
	"dl",
	"dt",
	"figcaption",
	"figure",
	"form",
	"hr",
	"li",
	"main",
	"ol",
	"p",
	"section",
	"table",
	"tbody",
	"td",
	"th",
	"thead",
	"tr",
	"ul",
]);

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "summary"]);

/** Elements that are never page content. */
const STRIP_SELECTOR = [
	"script",
	"style",
	"noscript",
	"template",
	"iframe",
	"svg",
	"nav",
	"footer",
	"header",
	"form",
	"button",
	"dialog",
	"[role='navigation']",
	"[aria-hidden='true']",
].join(", ");

/** The markets a page prints content for, judged by its `data-cur` markers. */
export function detectVariants(html: string): PageVariant[] {
	const $ = cheerio.load(html);
	const has = (cur: string) => $(`[data-cur="${cur}"]`).length > 0;
	const lang = pageLanguage($);
	if (has("mxn") && has("usd")) {
		return [
			{ market: "mx", label: MARKET_LABEL[lang].mx },
			{ market: "us", label: MARKET_LABEL[lang].us },
		];
	}
	return [{ market: null, label: null }];
}

function pageLanguage($: cheerio.CheerioAPI): "en" | "es" {
	return ($("html").attr("lang") ?? "en").toLowerCase().startsWith("es")
		? "es"
		: "en";
}

type Line = { text: string; heading?: number };

type El = { type: string; name: string; children: AnyNode[]; data?: string };

/** Inline tags that can sit INSIDE a word ("<b>Cush</b>Labs"); every other tag boundary is a word boundary. */
const TIGHT_INLINE = new Set([
	"abbr",
	"b",
	"code",
	"em",
	"i",
	"mark",
	"small",
	"strong",
	"sub",
	"sup",
	"u",
]);

/**
 * Visible text of a subtree, with a space at every element boundary except the
 * tight inline ones. `cheerio.text()` concatenates adjacent elements with no
 * separator, which turned `<span>$1,990</span><span>MXN/mo</span>` into
 * "$1,990MXN/mo".
 */
function spacedText(node: AnyNode): string {
	const n = node as unknown as El;
	if (n.type === "text") return n.data ?? "";
	if (n.type !== "tag") return "";
	const inner = n.children.map(spacedText).join("");
	return TIGHT_INLINE.has(n.name.toLowerCase()) ? inner : ` ${inner} `;
}

const clean = (t: string) => t.replace(/\s+/g, " ").trim();

function childTags(node: AnyNode, names: string[]): AnyNode[] {
	const out: AnyNode[] = [];
	const visit = (n: AnyNode) => {
		const el = n as unknown as El;
		if (el.type !== "tag") return;
		if (names.includes(el.name.toLowerCase())) {
			out.push(n);
			return;
		}
		for (const c of el.children) visit(c);
	};
	for (const c of (node as unknown as El).children) visit(c);
	return out;
}

/**
 * A comparison table, as lines a model can read without seeing the grid.
 *
 * Flattened cell-by-cell, cushlabs.ai's plan comparison became runs of
 * "Not included / Included / Included" with nothing saying which plan each one
 * belongs to. Each body row is rendered as "Feature: Basic: x; Premium: y;
 * Ultra: z", and a row that is a single spanning header cell (a feature group)
 * becomes a sub-heading so each group is its own retrievable chunk.
 */
function tableToLines(table: AnyNode, level: number): Line[] {
	const rows = childTags(table, ["tr"]);
	const lines: Line[] = [];
	let columns: string[] = [];

	for (const row of rows) {
		const cells = childTags(row, ["th", "td"]);
		const texts = cells.map((c) => clean(spacedText(c)));
		const inHead =
			((row as unknown as { parent?: El }).parent?.name ?? "") === "thead";

		if (inHead && columns.length === 0) {
			// A header cell often stacks a badge, a name, a tagline and a price.
			// The column NAME is its shortest text line without a price in it.
			columns = cells.map((c) => {
				const parts = (c as unknown as El).children
					.map((ch) => clean(spacedText(ch)))
					.filter((t) => t.length > 1 && !/[$\d]/.test(t));
				return (
					parts.sort((a, b) => a.length - b.length)[0] ?? clean(spacedText(c))
				);
			});
			const described = texts
				.map((t, i) =>
					columns[i] && t
						? t === columns[i]
							? t
							: `${columns[i]} (${t})`
						: "",
				)
				.filter(Boolean);
			if (described.length > 0)
				lines.push({ text: `Plans compared: ${described.join("; ")}` });
			continue;
		}

		const nonEmpty = texts.filter(Boolean);
		if (cells.length === 1 || nonEmpty.length === 1) {
			if (nonEmpty[0]) lines.push({ text: nonEmpty[0], heading: level });
			continue;
		}

		const [label, ...values] = texts;
		const pairs = values
			.map((v, i) => {
				const col = columns[i + 1];
				const value = v || "—";
				return col ? `${col}: ${value}` : value;
			})
			.join("; ");
		lines.push({ text: label ? `${label}: ${pairs}` : pairs });
	}
	return lines;
}

/**
 * Lines of visible text, in document order. A heading is its own line and
 * carries its level (summary counts as level 5, below h4, so an accordion
 * question nests under the h2/h3 it sits in).
 */
function toLines(root: AnyNode): Line[] {
	const lines: Line[] = [];
	let buf = "";
	let lastHeading = 1;
	const flush = () => {
		const text = clean(buf);
		// A bare "01" / "2" is a step badge from the layout, not content.
		if (text && !/^\d{1,2}$/.test(text)) lines.push({ text });
		buf = "";
	};

	const walk = (node: AnyNode) => {
		const el = node as unknown as El;
		if (el.type === "text") {
			buf += el.data ?? "";
			return;
		}
		if (el.type !== "tag") return;
		const tag = el.name.toLowerCase();

		if (HEADING_TAGS.has(tag)) {
			flush();
			const text = clean(spacedText(node));
			if (text) {
				lastHeading = tag === "summary" ? 5 : Number(tag.slice(1));
				lines.push({ text, heading: lastHeading });
			}
			return;
		}

		if (tag === "table") {
			flush();
			lines.push(...tableToLines(node, Math.min(lastHeading + 1, 6)));
			return;
		}

		const tight = TIGHT_INLINE.has(tag);
		const block = BLOCK_TAGS.has(tag);
		if (block) flush();
		else if (!tight) buf += " ";
		for (const child of el.children) walk(child);
		if (block) flush();
		else if (!tight) buf += " ";
	};

	walk(root);
	flush();
	return lines;
}

type Section = { path: string[]; body: string[] };

function toSections(lines: Line[]): Section[] {
	const sections: Section[] = [];
	const stack: Array<{ level: number; text: string }> = [];
	let current: Section = { path: [], body: [] };

	for (const line of lines) {
		if (line.heading === undefined) {
			current.body.push(line.text);
			continue;
		}
		if (current.body.length > 0) sections.push(current);
		while (stack.length > 0 && stack[stack.length - 1].level >= line.heading) {
			stack.pop();
		}
		stack.push({ level: line.heading, text: line.text });
		// h1 is the page title, already in the prefix; leave it out of the path.
		current = {
			path: stack.filter((s) => s.level > 1).map((s) => s.text),
			body: [],
		};
	}
	if (current.body.length > 0) sections.push(current);

	/**
	 * A section with its own text also names its sub-sections.
	 *
	 * cushlabs.ai/services/premium/ has "What Premium adds" with one line of its
	 * own ("Everything in Basic keeps running. These four start.") and the four
	 * additions as sub-headings. Chunked as-is, the chunk that best matches
	 * "What's in Premium?" was that one line, and the assistant — with no list in
	 * front of it — recited the Basic recap instead of the four additions.
	 * Listing the sub-headings makes the parent chunk an index of its children.
	 */
	for (let i = 0; i < sections.length; i++) {
		const parent = sections[i];
		if (parent.path.length === 0) continue;
		const children: string[] = [];
		for (let j = i + 1; j < sections.length; j++) {
			const child = sections[j];
			const nested =
				child.path.length > parent.path.length &&
				parent.path.every((p, k) => child.path[k] === p);
			if (!nested) break;
			if (child.path.length === parent.path.length + 1) {
				children.push(child.path[child.path.length - 1]);
			}
		}
		if (children.length >= 2) {
			parent.body = [...parent.body, ...children.map((c) => `- ${c}`)];
		}
	}

	// Fold a too-short section into the next one so a lone "Learn more" line, or
	// a one-sentence hero, does not become its own near-empty vector.
	const merged: Section[] = [];
	for (let i = 0; i < sections.length; i++) {
		const s = sections[i];
		const size = s.body.join(" ").length;
		const next = sections[i + 1];
		if (size < MIN_SECTION_CHARS && next) {
			next.body = [
				...(s.path.length > 0 ? [s.path[s.path.length - 1]] : []),
				...s.body,
				...next.body,
			];
			if (next.path.length === 0) next.path = s.path;
			continue;
		}
		merged.push(s);
	}
	return merged;
}

/** Split a long section on line boundaries; never mid-sentence unless a line alone is too long. */
function splitBody(body: string[]): string[] {
	const parts: string[] = [];
	let cur = "";
	for (const line of body) {
		const pieces =
			line.length > MAX_CHUNK_CHARS
				? (line.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [line])
				: [line];
		for (const piece of pieces) {
			const p = piece.trim();
			if (!p) continue;
			if (cur && cur.length + p.length + 1 > MAX_CHUNK_CHARS) {
				parts.push(cur);
				cur = p;
			} else {
				cur = cur ? `${cur}\n${p}` : p;
			}
		}
	}
	if (cur) parts.push(cur);
	return parts;
}

/**
 * Every chunk for one page, for every market it prints.
 *
 * Content that is identical in both market renderings (most of a pricing page:
 * feature lists, the FAQ) would otherwise be stored twice, once under each
 * label. It is emitted once, unlabelled, so a market label only ever appears on
 * text that actually differs by market — which is the signal the model needs.
 */
export function pageToChunks(html: string): {
	title: string;
	/** The site's name from a "Page | Brand" title, else null. */
	brand: string | null;
	language: "en" | "es";
	chunks: SectionChunk[];
} {
	const variants = detectVariants(html);
	const base = cheerio.load(html);
	const title = base("title").text().replace(/\s+/g, " ").trim();
	const language = pageLanguage(base);
	const pipe = title.lastIndexOf("|");
	const brand = pipe > 0 ? title.slice(pipe + 1).trim() || null : null;
	const pageName = (pipe > 0 ? title.slice(0, pipe) : title).trim();

	const perVariant = variants.map((v) => {
		const $ = cheerio.load(html);
		if (v.market === "mx") $('[data-cur="usd"]').remove();
		if (v.market === "us") $('[data-cur="mxn"]').remove();
		$(STRIP_SELECTOR).remove();
		const root = $("main").first().get(0) ?? $("body").first().get(0);
		if (!root) return { v, sections: [] as Section[] };
		return { v, sections: toSections(toLines(root)) };
	});

	const bodyKey = (s: Section, part: string) =>
		`${s.path.join(" > ")}\n${part}`;
	const counts = new Map<string, number>();
	for (const { sections } of perVariant) {
		for (const s of sections) {
			for (const part of splitBody(s.body)) {
				const k = bodyKey(s, part);
				counts.set(k, (counts.get(k) ?? 0) + 1);
			}
		}
	}

	const chunks: SectionChunk[] = [];
	const emittedShared = new Set<string>();
	for (const { v, sections } of perVariant) {
		for (const s of sections) {
			for (const part of splitBody(s.body)) {
				const k = bodyKey(s, part);
				const shared =
					variants.length > 1 && (counts.get(k) ?? 0) === variants.length;
				if (shared && emittedShared.has(k)) continue;
				if (shared) emittedShared.add(k);
				const heading = s.path.join(" > ");
				const header = [title, heading].filter(Boolean).join(" — ");
				const label = shared ? null : v.label;
				chunks.push({
					content: [header, label ? `[${label}]` : null, part]
						.filter(Boolean)
						.join("\n"),
					heading,
					leaf: s.path[s.path.length - 1] ?? pageName,
					market: shared ? null : v.market,
				});
			}
		}
	}

	return { title, brand, language, chunks };
}

/**
 * Deterministic row id for a website chunk: the same source, page and text
 * always produce the same UUID. A re-run then inserts with ON CONFLICT DO
 * NOTHING and can never create a duplicate, and "which rows are current" is a
 * set comparison of ids rather than a guess.
 */
export function websiteChunkId(
	sourceId: string,
	url: string,
	content: string,
): string {
	const h = createHash("sha256")
		.update(`${sourceId}\n${url}\n${content}`)
		.digest("hex");
	// Shape it as an RFC 4122 v5-style UUID (version and variant nibbles set).
	return [
		h.slice(0, 8),
		h.slice(8, 12),
		`5${h.slice(13, 16)}`,
		((Number.parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80)
			.toString(16)
			.padStart(2, "0") + h.slice(18, 20),
		h.slice(20, 32),
	].join("-");
}
