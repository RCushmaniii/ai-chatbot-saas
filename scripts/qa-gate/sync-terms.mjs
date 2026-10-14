/**
 * Copies the CushLabs commercial terms (prices, trial, cancellation) from the
 * operating-system repo — the single source of truth — into the QA gate, so
 * the gate checks the bot's prices against the real list rather than a
 * retyped one.
 *
 *   pnpm qa-gate:sync-terms
 *
 * Fails loudly if the source is missing or not valid JSON; it never leaves a
 * half-written copy behind.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(
	here,
	"../../../operating-system/cushlabs/commercial-terms.json",
);
const target = join(here, "cushlabs-commercial-terms.json");

if (!existsSync(source)) {
	console.error(
		`Source not found: ${source}\nClone the operating-system repo next to this one.`,
	);
	process.exit(1);
}
const text = readFileSync(source, "utf8");
const terms = JSON.parse(text); // throws on bad JSON — on purpose
if (!terms.pricing?.usd?.display || !terms.pricing?.mxn?.display) {
	console.error("Source has no pricing.usd.display / pricing.mxn.display.");
	process.exit(1);
}
const before = existsSync(target) ? readFileSync(target, "utf8") : "";
writeFileSync(target, text);
console.log(
	before === text
		? "Terms already current."
		: `Updated ${target} (last_updated ${terms._meta?.last_updated ?? "?"}).`,
);
