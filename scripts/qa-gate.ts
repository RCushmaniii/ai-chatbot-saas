/**
 * Website widget QA gate — real visitor conversations through the real API.
 *
 * Sends each scenario to POST /api/embed/chat, the same endpoint and body the
 * widget iframe sends (visitorId, sessionId, conversationId, page URL, page
 * title), so every run exercises the production prompt, model, knowledge
 * search and logging. It never calls a function directly: a piece that passes
 * alone can still fail through the route a real message takes.
 *
 * Facts and rules are asserted exactly (prices from the source of truth,
 * links, language, banned phrases, prompt leaks, re-introductions). Tone and
 * empathy are NOT judged here — a person reads the replies. No second AI
 * grades anything: it would add cost and make its own mistakes.
 *
 * Usage (PowerShell, from the repo root):
 *   pnpm qa-gate                                        production (www.soyconverso.com)
 *   pnpm qa-gate --url http://localhost:3000            local `pnpm dev`
 *   pnpm qa-gate --only pricing                         scenarios whose id contains "pricing"
 *   pnpm qa-gate --save qa-baseline.json                keep this run
 *   pnpm qa-gate --compare qa-baseline.json             FIXED / BROKE / CHANGED vs a kept run
 *   pnpm qa-gate --url http://localhost:3000 --model gpt-4.1-mini   (ignored on production)
 *
 * Exit 0 = every scenario passed. 1 = a scenario failed. 2 = rate limited,
 * 3 = wrong model answered, 4 = gate traffic not recognised, 5 = deployment
 * not configured for a business (nothing is judged on 2–5).
 *
 * Full documentation and the change routine: docs/QA_GATE.md
 */

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { cushlabs } from "./qa-gate/cushlabs";
import type { Lang, Scenario, TenantSuite } from "./qa-gate/types";

config({ path: ".env.local", quiet: true });

const TENANTS: Record<string, TenantSuite> = { cushlabs };

// maxWords is the TARGET; up to this many over is reported, beyond it fails.
const WORD_ALLOWANCE = 20;

// ── Arguments ───────────────────────────────────────────────────────────────

function arg(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

// ── Reply checks ────────────────────────────────────────────────────────────

/**
 * Word lists, matched on whole Unicode words. A `\b` regex treats an accented
 * letter as a word boundary, so "qué" never matched and "¡Hola! ¿En qué puedo
 * ayudarte hoy?" scored as English (first PR 3 run, 2026-10-14). Deliberately
 * separate from the server's lib/embed/visitor-language.ts, so one bug cannot
 * blind both the bot and the test.
 */
const SPANISH_WORDS = new Set(
	"que qué para con una los las por más tu tus te es en el la de y cómo puedes puedo negocio clientes también está hola hoy ayudarte tienes tu sitio llamada precio planes mes".split(
		" ",
	),
);
const ENGLISH_WORDS = new Set(
	"the and you your for with this that is are can what business customers how help today i we our it of to".split(
		" ",
	),
);

function detectLang(text: string): Lang {
	let es = /[¿¡ñáéíóú]/i.test(text) ? 1 : 0;
	let en = 0;
	for (const w of text.toLowerCase().match(/\p{L}+/gu) ?? []) {
		if (SPANISH_WORDS.has(w)) es++;
		if (ENGLISH_WORDS.has(w)) en++;
	}
	return es > en ? "es" : "en";
}

function visibleText(text: string): string {
	// Link text, not the URL behind it; bare URLs do not count as words.
	return text
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/https?:\/\/\S+/g, "")
		.replace(/\*\*|__/g, "")
		.trim();
}

function words(text: string): number {
	const v = visibleText(text);
	return v ? v.split(/\s+/).length : 0;
}

function links(text: string): string[] {
	return Array.from(
		new Set(
			text
				.match(/https?:\/\/[^\s)\]>"']+/g)
				?.map((u) => u.replace(/[.,;:!?]+$/, "")) ?? [],
		),
	);
}

/** "$1,990" / "$ 229" / "$129.00" → "$1,990" / "$229" / "$129" */
function prices(text: string): string[] {
	return Array.from(
		text.matchAll(/\$\s?(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})?/g),
	).map((m) => `$${m[1]}`);
}

/** Rules every reply follows, whatever the scenario. */
function universalProblems(
	t: TenantSuite,
	s: Scenario,
	reply: string,
): string[] {
	const out: string[] = [];
	const lower = reply.toLowerCase();
	if (!reply.trim()) out.push("empty reply");
	if (detectLang(reply) !== s.lang) {
		out.push(`replied in the wrong language (visitor wrote ${s.lang})`);
	}
	if (/^\s*\**\s*(learn more|más información)\s*:?/im.test(reply)) {
		out.push('has a forced "Learn more" / "Más información" section');
	}
	for (const u of links(reply)) {
		let host = "";
		try {
			host = new URL(u).hostname;
		} catch {
			host = "(unparseable)";
		}
		if (!t.linkHosts.includes(host))
			out.push(`invented or off-site link: ${u}`);
	}
	for (const p of prices(reply)) {
		if (!t.allowedPrices.includes(p)) {
			out.push(
				`price ${p} is not in the source of truth (${t.allowedPrices.join(", ")})`,
			);
		}
	}
	for (const phrase of t.bannedPhrases) {
		if (lower.includes(phrase.toLowerCase()))
			out.push(`banned phrase: "${phrase}"`);
	}
	for (const frag of t.promptFragments) {
		if (lower.includes(frag.toLowerCase()))
			out.push(`leaks instructions: "${frag}"`);
	}
	return out;
}

function scenarioProblems(
	t: TenantSuite,
	s: Scenario,
	reply: string,
): string[] {
	const e = s.expect;
	const out = universalProblems(t, s, reply);
	// Both the readable text (so "**Premium**" matches "Premium") and the raw
	// reply (so link URLs can be matched).
	const lower = `${visibleText(reply)}\n${reply}`.toLowerCase();

	for (const term of e.includesAll ?? []) {
		if (!lower.includes(term.toLowerCase())) out.push(`missing "${term}"`);
	}
	if (
		e.includesAny &&
		!e.includesAny.some((x) => lower.includes(x.toLowerCase()))
	) {
		out.push(`contains none of: ${e.includesAny.join(" | ")}`);
	}
	for (const term of e.excludesAll ?? []) {
		if (lower.includes(term.toLowerCase()))
			out.push(`must not contain "${term}"`);
	}
	if (e.excludesPattern) {
		const m = new RegExp(e.excludesPattern, "i").exec(reply);
		if (m) out.push(`must not say "${m[0]}"`);
	}
	if (e.noLinks && links(reply).length) {
		out.push(`should have no links, has ${links(reply).join(", ")}`);
	}
	if (e.maxWords !== undefined && words(reply) > e.maxWords + WORD_ALLOWANCE) {
		out.push(
			`${words(reply)} words — target ${e.maxWords}, limit ${e.maxWords + WORD_ALLOWANCE}`,
		);
	}
	return out;
}

function lengthNote(s: Scenario, reply: string): string | null {
	const max = s.expect.maxWords;
	if (max === undefined) return null;
	const n = words(reply);
	return n > max && n <= max + WORD_ALLOWANCE
		? `${n} words — over the ${max} target, inside the ${WORD_ALLOWANCE}-word allowance`
		: null;
}

// ── Runner ──────────────────────────────────────────────────────────────────

interface Result {
	id: string;
	ok: boolean;
	problems: string[];
	reply: string;
	status: number;
	totalMs: number;
	steps: Record<string, number>;
	model: string;
	internal: boolean;
	configured: boolean;
}

/** "ratelimit;dur=12.0, pre;dur=840" → { ratelimit: 12, pre: 840 } */
function parseServerTiming(header: string | null): Record<string, number> {
	const out: Record<string, number> = {};
	for (const part of (header ?? "").split(",")) {
		const m = /^\s*([\w-]+)\s*;\s*dur=([\d.]+)/.exec(part);
		if (m) out[m[1]] = Number(m[2]);
	}
	return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function headers(t: TenantSuite): Record<string, string> {
	const model = arg("model");
	return {
		"Content-Type": "application/json",
		Origin: t.origin,
		// Stored as internal traffic, not counted as usage — only when the token
		// matches QA_GATE_TOKEN on the server (lib/embed/internal-traffic.ts).
		"x-test-run": "qa-gate",
		"x-qa-token": process.env.QA_GATE_TOKEN?.trim() ?? "",
		...(model ? { "x-chat-model": model } : {}),
	};
}

async function post(
	baseUrl: string,
	t: TenantSuite,
	body: Record<string, unknown>,
): Promise<{
	status: number;
	reply: string;
	json: Record<string, unknown>;
	res: Response;
	ms: number;
}> {
	const t0 = performance.now();
	const res = await fetch(`${baseUrl}/api/embed/chat`, {
		method: "POST",
		headers: headers(t),
		body: JSON.stringify(body),
	});
	const text = await res.text();
	const ms = performance.now() - t0;
	let json: Record<string, unknown> = {};
	try {
		json = JSON.parse(text);
	} catch {
		json = { response: text };
	}
	const reply =
		typeof json.response === "string"
			? json.response
			: typeof json.error === "string"
				? json.error
				: text;
	return { status: res.status, reply, json, res, ms };
}

async function run(
	baseUrl: string,
	t: TenantSuite,
	s: Scenario,
	gap: number,
): Promise<Result> {
	// A fresh visitor per scenario, exactly the identity the widget sends.
	const visitorId = `qa-gate-${randomUUID()}`;
	const sessionId = randomUUID();
	let conversationId: string | undefined;
	const page = s.page ?? { url: t.defaultPage[s.lang], title: "" };

	let last: Awaited<ReturnType<typeof post>> | null = null;
	for (const [i, message] of s.turns.entries()) {
		if (i > 0) await sleep(gap);
		last = await post(baseUrl, t, {
			message,
			visitorId,
			sessionId,
			conversationId,
			currentUrl: page.url,
			pageTitle: page.title || undefined,
			language: s.lang,
			...s.body,
		});
		if (typeof last.json.conversationId === "string")
			conversationId = last.json.conversationId;
		const isLast = i === s.turns.length - 1;
		if (!isLast && last.status !== 200) break;
	}
	if (!last) throw new Error(`scenario ${s.id} has no turns`);

	const expected = s.expect.status ?? 200;
	const steps = parseServerTiming(last.res.headers.get("server-timing"));
	const model = last.res.headers.get("x-chat-model") ?? "?";
	const internal = last.res.headers.get("x-traffic") === "internal";
	const configured = last.res.headers.get("x-tenant-configured") !== "no";

	let problems: string[];
	if (last.status !== expected) {
		problems = [
			`HTTP ${last.status} (expected ${expected}): ${last.reply.slice(0, 200)}`,
		];
	} else if (expected !== 200) {
		problems = [];
	} else {
		problems = scenarioProblems(t, s, last.reply);
	}

	return {
		id: s.id,
		ok: problems.length === 0,
		problems,
		reply: last.reply,
		status: last.status,
		totalMs: last.ms,
		steps,
		model,
		internal,
		configured,
	};
}

/**
 * The same warm-up the widget sends when a visitor hovers over, touches or
 * focuses the chat button: GET /api/embed/chat. Its own time IS the cold
 * start, reported on its own line, so one cold answer does not set the P95.
 */
async function warmUp(baseUrl: string, t: TenantSuite): Promise<string> {
	const t0 = performance.now();
	try {
		const res = await fetch(`${baseUrl}/api/embed/chat`, {
			headers: { Origin: t.origin },
		});
		const state =
			res.headers.get("x-warm") ?? `HTTP ${res.status} (no warm-up endpoint?)`;
		const server = parseServerTiming(res.headers.get("server-timing")).warm;
		return `${state} in ${sec(performance.now() - t0)}${server !== undefined ? ` (server ${Math.round(server)}ms)` : ""}`;
	} catch (err) {
		return `failed (${err instanceof Error ? err.message : String(err)}), continuing cold`;
	}
}

function percentile(values: number[], p: number): number {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[
		Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
	];
}

async function main(): Promise<void> {
	const tenant = TENANTS[arg("tenant") ?? "cushlabs"];
	if (!tenant) {
		console.error(
			`Unknown --tenant. Known: ${Object.keys(TENANTS).join(", ")}`,
		);
		process.exit(64);
	}
	const baseUrl = (arg("url") ?? tenant.defaultUrl).replace(/\/$/, "");
	const only = arg("only");
	/**
	 * The chat route allows 30 messages a minute per IP (app/api/embed/chat,
	 * lib/rate-limit.ts). 2500ms apart keeps a full run at ~24 a minute, under
	 * the limit with room for the warm-up and a person using the widget.
	 */
	const gap = Number(arg("gap") ?? 2500);
	const scenarios = only
		? tenant.scenarios.filter((s) => s.id.includes(only))
		: tenant.scenarios;
	const log = (line: string) => process.stdout.write(`${line}\n`);

	if (!process.env.QA_GATE_TOKEN?.trim()) {
		log(
			"STOPPED: QA_GATE_TOKEN is not set in .env.local, so every gate message would count as a real visitor and against the tenant's monthly quota. Nothing was sent.",
		);
		process.exit(4);
	}

	// The warm-up result is the FIRST line of every run (or says it was skipped).
	const cold = flag("cold");
	log(
		cold
			? "Warm-up: SKIPPED (--cold) — the first scenario measures a cold start on purpose"
			: `Warm-up (the request the chat button sends on hover/open): ${await warmUp(baseUrl, tenant)}`,
	);
	const turns = scenarios.reduce((n, s) => n + s.turns.length, 0);
	log(
		`QA gate — ${tenant.name} — ${baseUrl}/api/embed/chat · ${scenarios.length} scenarios (${turns} messages) · ${gap}ms apart` +
			(arg("model") ? ` · model ${arg("model")}` : ""),
	);

	if (flag("cached")) {
		log(
			"Note: --cached does nothing here — this deployment has no saved-answer cache, every answer is fresh.",
		);
	}

	const results: Result[] = [];
	for (const [i, s] of scenarios.entries()) {
		if (i > 0) await sleep(gap);
		const r = await run(baseUrl, tenant, s, gap);

		if (r.status === 429 && !/monthly/i.test(r.reply)) {
			log(
				`STOPPED at ${s.id}: rate limited (HTTP 429). Real visitors are unaffected. Wait a minute and rerun. Nothing was judged.`,
			);
			process.exit(2);
		}
		if (!r.configured) {
			log(
				`STOPPED at ${s.id}: this deployment is not configured for a business (it answered "not set up yet"). ` +
					"On a local dev server, add DEFAULT_BUSINESS_ID and DEFAULT_BOT_ID to the local env file and restart it. Nothing was judged.",
			);
			process.exit(5);
		}
		if (r.status === 200 && !r.internal) {
			log(
				`STOPPED at ${s.id}: the server did not recognise this as gate traffic (no "X-Traffic: internal"). ` +
					"QA_GATE_TOKEN in .env.local does not match the one on the server, so messages were being counted as real visitors. Nothing was judged.",
			);
			process.exit(4);
		}
		const asked = arg("model");
		if (asked && r.status === 200 && r.model !== asked) {
			log(
				`STOPPED at ${s.id}: asked for ${asked} but ${r.model} answered. --model only works outside production (the local dev server). Nothing was judged.`,
			);
			process.exit(3);
		}

		results.push(r);
		log(
			`${r.ok ? "PASS" : "FAIL"}  ${s.id}  (${sec(r.totalMs)}${r.model !== "?" ? `, ${r.model}` : ""})`,
		);
		const note = r.status === 200 && r.ok ? lengthNote(s, r.reply) : null;
		if (note) log(`      ~ ${note}`);
		if (!r.ok) {
			for (const p of r.problems) log(`      ✗ ${p}`);
			log(
				`      reply: ${r.reply.replace(/\n/g, "\n             ").slice(0, 900)}`,
			);
		}
	}

	const passed = results.filter((r) => r.ok).length;
	log("");
	log(`Result: ${passed}/${results.length} passed`);

	// ── Speed: reported, never enforced ──
	const answered = results.filter((r) => r.status === 200);
	const [first, ...rest] = answered;
	if (first) {
		log(
			'Speed (measured from this machine; the chat API returns the whole answer at once, so "first words" and "full answer" are the same moment):',
		);
		log(
			`  first answer ${cold ? "(cold, --cold)" : "after warm-up"}: ${first.id} ${sec(first.totalMs)} — reported on its own, not in the figures below`,
		);
		if (rest.length) {
			const total = rest.map((r) => r.totalMs);
			log(
				`  full answer — median ${sec(percentile(total, 50))}, P95 ${sec(percentile(total, 95))} (${rest.length} answers)`,
			);
			const names = Array.from(
				new Set(rest.flatMap((r) => Object.keys(r.steps))),
			);
			if (names.length) {
				log(
					"  server steps (Server-Timing; 'pre' = everything before the model):",
				);
				for (const name of names) {
					const v = rest
						.filter((r) => name in r.steps)
						.map((r) => r.steps[name]);
					log(
						`    ${name.padEnd(10)} median ${Math.round(percentile(v, 50))}ms, P95 ${Math.round(percentile(v, 95))}ms  (${v.length})`,
					);
				}
			}

			/**
			 * The slowest answer, split by where its time went. With fewer than 20
			 * answers P95 IS this answer, so this line explains the P95.
			 */
			const slowest = rest.reduce((a, b) => (b.totalMs > a.totalMs ? b : a));
			const st = slowest.steps;
			const sum = (keys: string[]) =>
				keys.reduce((n, k) => n + (st[k] ?? 0), 0);
			const database = sum([
				"ratelimit",
				"quota",
				"log",
				"persona",
				"search",
				"save",
			]);
			const embedding = sum(["embed"]);
			const model = sum(["model"]);
			const server = (st.pre ?? 0) + model + (st.save ?? 0);
			const rawSteps = Object.entries(st)
				.map(([n, ms]) => `${n} ${Math.round(ms)}ms`)
				.join(", ");
			log(
				`Slowest answer: ${slowest.id} ${sec(slowest.totalMs)}` +
					(rest.length < 20
						? ` — with only ${rest.length} answers, P95 is effectively this one answer`
						: ""),
			);
			log(
				Object.keys(st).length
					? `  database ${Math.round(database)}ms · embedding ${Math.round(embedding)}ms · model ${Math.round(model)}ms · network and the rest ${Math.max(0, Math.round(slowest.totalMs - server))}ms`
					: "  no Server-Timing header on this answer",
			);
			if (rawSteps) log(`  steps: ${rawSteps}`);
		}
	}

	// ── Compare with a kept run ──
	const compareFile = arg("compare");
	if (compareFile) {
		const before: Result[] = JSON.parse(readFileSync(compareFile, "utf8"));
		const byId = new Map(before.map((r) => [r.id, r]));
		log(`\nCompared with ${compareFile}:`);
		let changes = 0;
		for (const r of results) {
			const b = byId.get(r.id);
			if (!b) {
				log(`  NEW      ${r.id}`);
				changes++;
			} else if (b.ok !== r.ok) {
				log(`  ${r.ok ? "FIXED   " : "BROKE   "} ${r.id}`);
				changes++;
			} else if (b.reply.trim() !== r.reply.trim()) {
				log(`  CHANGED  ${r.id} (same verdict, different reply — read it)`);
				changes++;
			}
		}
		if (!changes) log("  no differences");
		log(
			"  Read every BROKE and CHANGED reply before merging (--save this run to keep them).",
		);
	}

	const saveFile = arg("save");
	if (saveFile) {
		writeFileSync(saveFile, JSON.stringify(results, null, 2));
		log(`Saved to ${saveFile}`);
	}

	process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
	console.error("QA gate crashed:", err);
	process.exit(70);
});
