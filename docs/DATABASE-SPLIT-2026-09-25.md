# The database split, 2026-09-25

Converso ran on New York English Teacher's Neon database for eight months. This
records why, what was done about it, and what is still true afterwards — because
the next person to wonder "can I just run `db:push`?" needs the answer in the
repo, not in a chat log.

## How it happened

`ai-chatbot-saas` is a **clone** of `ny-ai-chatbot`, not a fork. Both repos carry
identical commit SHAs through `a4b9a23` and diverge on 2025-12-02. When the
Converso Vercel project was created on 2026-01-24 (`29dfbb3 feat: Phase 1 —
Converso rebrand and foundation`), it was pointed at NYET's existing database
rather than given one of its own.

The environment variables are the evidence. `ny-ai-chatbot` carries the full
Neon-integration series — `DATABASE_URL`, `NEON_PROJECT_ID`, `PGDATABASE`,
`POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PRISMA_URL` —
which is what Vercel injects when it provisions a database. This project carried
a single hand-set connection variable.

**Nobody decided to share a database.** A clone inherited a pointer, the app
worked, and nothing surfaced it for eight months.

## What it cost while it lasted

- **A client's site wore the wrong brand.** NYET's `/api/embed/settings` does an
  unscoped `SELECT * FROM bot_settings ORDER BY updatedAt DESC LIMIT 1`. The
  shared database held exactly one such row — CushLabs' — so
  chat.nyenglishteacher.com greeted its visitors with _"Ask me anything about
  what CushLabs does, what it costs…"_.
- **Converso's crons ran inside a client's database.** `purge-old-messages`
  issues `DELETE FROM "WidgetMessage"` at 08:00 UTC daily; `retrain` rewrites
  `KnowledgeChunk`.
- **CI wrote to production.** The Preview environment shared the same connection,
  so every pull request's Playwright run created users and chats there. 469 of
  them by the end.
- **One command from either repo could have destroyed the other.**
  `drizzle-kit push` reconciles a database to a schema file. NYET's schema
  declares 13 tables; Converso's declares 33; the database held 38. A push from
  either side offered to drop the other's tables, including the 3,901 rows of
  NYET's live knowledge base.

## What was done

Converso now has its own Neon **project** — `converso` /
`broad-water-93272047`, PostgreSQL 17, `aws-us-east-1`. A project, not a branch:
a Neon branch is copy-on-write from its parent and would have inherited all
152,820 users and shared the quota, which is the opposite of the goal.

The schema was created from `pg_dump --schema-only` of the live database rather
than by replaying migrations. That was deliberate and it mattered: this repo has
**four** sources of schema truth, and a replay reproduces only the first.

1. `lib/db/migrations/` — 15 journalled drizzle migrations.
2. A 16th file in that same folder, `add-embed-settings.sql`, absent from the
   journal.
3. `migrations/` at the repo root — three files whose own README says to paste
   them into a SQL editor by hand. One of them creates
   `UsageRecord_business_month_unique`, which `incrementMessageCount`'s
   `ON CONFLICT (business_id, month)` depends on. Without it every widget message
   throws `42P10` and the chat is dead on the first question.
4. Anything applied ad hoc over the preceding year.

Data was **copied, never moved**. The old database still holds every Converso
row, untouched, as the rollback path.

| Table              | Rows                       |
| ------------------ | -------------------------- |
| Plan               | 4                          |
| User               | 2                          |
| Business           | 1                          |
| Membership         | 9 (since collapsed to 2)   |
| Bot                | 1                          |
| bot_settings       | 1                          |
| ContentSource      | 2                          |
| KnowledgeChunk     | 819, all embeddings intact |
| Subscription       | 1                          |
| UsageRecord        | 3                          |
| WidgetConversation | 13                         |
| WidgetMessage      | 26                         |

Deliberately **not** copied: `website_content` (3,901 NYET rows),
`knowledge_events`, `chat_analytics`, `lead_events`, `handoff_events`, the
152,813 guest users, the 469 CI chats, and `Document_Knowledge`'s 46
`business_id IS NULL` legacy rows.

## Three things that went wrong, and none reached production

1. **`CREATE SCHEMA public`** — `pg_dump` emits it; it already exists on a fresh
   Neon database. Failed on the first statement, nothing written.
2. **`relation "Business" does not exist`, twice.** Neon's pooled endpoint uses
   transaction pooling and discards session state between statements, so
   `SET search_path` never survived — and `pg_dump`'s preamble sets `search_path`
   to `''`. The symptom looked like the schema had not applied, while all 33
   tables were present. **Every table reference in the migration tooling is
   schema-qualified for this reason.** If you write `FROM "Business"` against
   this database from a pooled connection, expect it to fail.
3. **A validation check of mine was wrong**, twice — it looked for
   `UsageRecord_business_month_unique` in `pg_constraint` when it is a unique
   _index_, and asserted one owner-membership row where eight existed. The
   database was correct both times. Recorded because a failing check is not the
   same as a failing system, and the difference is one query.

## What is true now

- Production **and Preview** point at the new database. CI no longer writes into
  a client's production data.
- `drizzle.__drizzle_migrations` was baselined with all 15 journal entries
  (`pnpm db:baseline`), so `db:migrate` applies only migrations newer than
  `0014_blushing_quasimodo`. Verified: a run completes in ~1.2s and changes
  nothing. **Without this, the next `db:migrate` would have tried to
  `CREATE TABLE "User"` on a database that already has it.**
- `lib/db/migrate.ts` now loads `.env`, which is where this repo actually keeps
  its connection string. It previously threw `POSTGRES_URL is not defined` on
  every local run and only worked where the platform injected the environment —
  a large part of why schema changes ended up in a hand-run folder.
- Duplicate memberships collapsed 9 → 2 and a unique index
  `membership_business_user_unique` added. The provisioning script's
  `onConflictDoNothing()` had been decorative for eight runs because there was no
  constraint to infer.
- NYET serves its own settings again: it now owns a `bot_settings` row with a
  NULL `embedSettings`, which its route treats as "use my defaults". Added rather
  than deleting CushLabs' row, because that row is the rollback path.
- Both repos carry a `db:push` guard that refuses while the other app's tables
  are present. Converso's now **passes** — it disarmed itself, as designed. NYET's
  still fires, correctly, because Converso's rollback copy still lives there.

## Rolling back

Swap `POSTGRES_URL` on the Vercel project for the value recorded locally as
`POSTGRES_URL_OLD`, and redeploy. The old database still holds every Converso
row, and its persona still resolves — verified after NYET's settings row was
added.

What is **lost** on rollback is anything written to the new database since the
switch: widget conversations, usage counters, captured contacts, and any persona
edit made in `/admin`. Rollback is instant for reads and lossy for writes; it is
not a free undo.

## Still outstanding

- The old database holds Converso's tables as the rollback copy. Deleting them
  is a separate, later change — and note that NYET's `db:push` guard keys on
  those tables, so removing them also disarms that guard.
- 152,813 orphaned guest users remain there. Dormant since February; not urgent.
- The two migration folders have not been reconciled. `migrations/` still
  contains hand-run SQL that `db:migrate` will never apply. Until that is folded
  into the journal, a fresh database must be built from a dump, not a replay.
