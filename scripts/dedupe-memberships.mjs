#!/usr/bin/env node
/**
 * Collapse duplicate Membership rows and stop them coming back.
 *
 * THE DEFECT: scripts/provision-cushlabs-demo.ts inserts a Membership with no
 * conflict target while every other write in that file is a careful upsert. It
 * has been run eight times, so demo-bot@cushlabs.ai holds eight identical owner
 * memberships on the CushLabs business where it should hold one.
 *
 * WHY IT MATTERS BEYOND TIDINESS: every query that reaches bot_settings does it
 * by joining through an owner Membership and taking LIMIT 1 —
 * getBusinessPersona() in lib/db/queries.ts and /api/embed/settings both do.
 * Duplicates multiply that join, so the row chosen is arbitrary. It happens to
 * be harmless today because all eight point at the same user, and it stops being
 * harmless the moment a business has two real owners. The ORDER BY added on
 * 2026-09-23 made the choice deterministic; this removes the reason it was ever
 * ambiguous.
 *
 * The unique index is the actual fix. The delete just makes it possible to add.
 *
 * Safe by construction: rows are exact duplicates of (businessId, userId, role),
 * the oldest of each group is kept, and the persona is re-resolved afterwards to
 * prove the widget still has an identity.
 *
 * Usage:  node scripts/dedupe-memberships.mjs [--apply]
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.POSTGRES_URL, { ssl: "require", max: 1 });
const INDEX = "membership_business_user_unique";

const before = await sql`
  SELECT u.email, b.name AS business, m.role, count(*)::int AS n
  FROM public."Membership" m
  JOIN public."User" u ON u.id = m."userId"
  JOIN public."Business" b ON b.id = m."businessId"
  GROUP BY 1, 2, 3 ORDER BY n DESC`;

console.log("\nMembership rows today:\n");
let dupes = 0;
for (const r of before) {
	if (r.n > 1) dupes += r.n - 1;
	console.log(
		`   ${String(r.n).padStart(3)}  ${r.email} → ${r.business} (${r.role})${r.n > 1 ? "  ← duplicated" : ""}`,
	);
}
console.log(`\n   ${dupes} redundant row(s)\n`);

if (!APPLY) {
	console.log("--dry-run (default). Pass --apply to collapse them.\n");
	await sql.end();
	process.exit(0);
}

const deleted = await sql`
  DELETE FROM public."Membership" m
  USING public."Membership" keep
  WHERE m."businessId" = keep."businessId"
    AND m."userId" = keep."userId"
    AND m."createdAt" > keep."createdAt"`;
console.log(`removed ${deleted.count} duplicate row(s) ✅`);

// Belt and braces: identical createdAt would survive the above.
const leftover = await sql`
  DELETE FROM public."Membership" m
  USING public."Membership" keep
  WHERE m."businessId" = keep."businessId"
    AND m."userId" = keep."userId"
    AND m."createdAt" = keep."createdAt"
    AND m.id > keep.id`;
if (leftover.count > 0)
	console.log(`removed ${leftover.count} same-timestamp duplicate(s) ✅`);

await sql.unsafe(
	`CREATE UNIQUE INDEX IF NOT EXISTS "${INDEX}" ON public."Membership" ("businessId", "userId")`,
);
console.log(`created unique index ${INDEX} ✅ — duplicates cannot recur`);

const after = await sql`
  SELECT u.email, b.name AS business, m.role, count(*)::int AS n
  FROM public."Membership" m
  JOIN public."User" u ON u.id = m."userId"
  JOIN public."Business" b ON b.id = m."businessId"
  GROUP BY 1, 2, 3 ORDER BY u.email`;
console.log("\nAfter:\n");
for (const r of after)
	console.log(
		`   ${String(r.n).padStart(3)}  ${r.email} → ${r.business} (${r.role})`,
	);

const persona = await sql`
  SELECT bs."customInstructions" AS ci
  FROM public.bot_settings bs
  INNER JOIN public."Membership" m ON m."userId" = bs."userId"
  WHERE m."businessId" = 'c051ab50-0000-4000-a000-000000000002'
    AND m.role = 'owner'
    AND bs."customInstructions" IS NOT NULL AND bs."customInstructions" <> ''
  ORDER BY bs."updatedAt" DESC LIMIT 1`;
console.log(
	`\npersona still resolves: ${persona.length === 1 ? `${persona[0].ci.length} chars ✅` : "MISSING ❌"}\n`,
);

await sql.end();
