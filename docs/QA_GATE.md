# Website Widget QA Gate

**No change that can alter what the widget says reaches `main` without passing this gate.**
That covers the tenant's instructions (`bot_settings.customInstructions`), the knowledge base,
`app/api/embed/**`, `app/embed/**`, `lib/embed/**`, `lib/ai/**` (prompts, models, routing, safety)
and knowledge search (`lib/ai/tools/search-knowledge.ts`).

Unit tests prove the code works. They say nothing about whether the bot gives a good answer. This
gate checks real answers. Its first run against ny-ai-chatbot's production bot failed 6 of 18
scenarios that every unit test had passed. Here, the first local run (2026-10-14) failed 7 of 25:
a forced "Learn more" footer, the MXN price list given to English visitors, page context ignored,
a Spanish follow-up answered without its context, and a Spanish prompt-extraction attempt refused in
English.

## What it is

`pnpm qa-gate` sends about two dozen real visitor questions (English and Mexican Spanish) through
`POST /api/embed/chat`, the same endpoint and request body the widget sends: visitor id, session id,
the server's conversation id carried into the next message, page URL and page title. It checks every
reply and exits non-zero on any failure, so it can block a change.

It never calls a function directly. A piece that passes alone can still fail on the path a real
message takes.

**No AI grades the replies.** A second model would add cost and make its own mistakes. The gate
judges facts and rules. Tone and empathy are judged by a person reading the replies.

## How to run it

Each line is one PowerShell command, run from the repo root.

```powershell
pnpm qa-gate
```

```powershell
pnpm qa-gate --url http://localhost:3000
```

```powershell
pnpm qa-gate --only pricing
```

```powershell
pnpm qa-gate --save docs/qa-gate/baseline.json
```

```powershell
pnpm qa-gate --url http://localhost:3000 --compare docs/qa-gate/baseline.json
```

```powershell
pnpm qa-gate --url http://localhost:3000 --model gpt-4.1-mini
```

```powershell
pnpm qa-gate --cold
```

| Option      | What it does                                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (none)      | Production, https://www.soyconverso.com                                                                                                                                                                              |
| `--url`     | Another deployment, usually the local dev server                                                                                                                                                                     |
| `--only`    | Only scenarios whose id contains this text                                                                                                                                                                           |
| `--save`    | Keep this run's results and replies                                                                                                                                                                                  |
| `--compare` | List FIXED, BROKE and CHANGED scenarios against a kept run                                                                                                                                                           |
| `--model`   | Answer with another model. Honored only outside production. The reply reports the model that wrote it (`X-Chat-Model`), and the gate stops if it isn't the one asked for. Allowed ids: `lib/embed/model-override.ts` |
| `--cold`    | Skip the warm-up, to measure a cold start on purpose                                                                                                                                                                 |
| `--gap`     | Milliseconds between messages (default 2500)                                                                                                                                                                         |
| `--tenant`  | Which tenant's scenarios (default `cushlabs`, the only tenant today)                                                                                                                                                 |

`--cached` does nothing here: this deployment has no saved-answer cache, so every answer is fresh.

### Exit codes

| Code | Meaning                                                                           |
| ---- | --------------------------------------------------------------------------------- |
| 0    | Every scenario passed                                                             |
| 1    | At least one scenario failed                                                      |
| 2    | Rate limited. Nothing was judged; wait a minute and rerun                         |
| 3    | `--model` asked for one model but another answered (you pointed it at production) |
| 4    | The server did not recognize gate traffic. The token is missing or doesn't match  |
| 5    | The deployment isn't configured for a business (it answered "not set up yet")     |

## Gate traffic is internal, and how that is protected

Every gate message carries `x-test-run: qa-gate` **and** `x-qa-token`, the `QA_GATE_TOKEN` value
from the local env file. When the server's own `QA_GATE_TOKEN` (set in Vercel production) matches,
the conversation is stored with `metadata.internal = true`, and the message is **not counted** toward
the tenant's monthly usage. The reply carries `X-Traffic: internal`, and the gate stops (exit 4)
the moment a reply comes back without it. A gate run can never be silently billed as visitors.

The token is required, unlike on ny-ai-chatbot, because this product bills by message count. A
header anyone could type would be a free unlimited plan. Without the matching token, a request is
an ordinary visitor: counted, rate limited and logged.

## Rate limit and spacing

The chat endpoint allows 30 messages a minute per IP (`lib/rate-limit.ts`, shared through Postgres
across instances). The gate spaces messages 2.5 seconds apart, about 24 a minute, so a full run
(about 27 messages) takes 2 to 3 minutes and stays under the limit. The warm-up has its own limit.

If you run the gate twice back to back, or use the widget heavily from the same IP while it runs,
it can hit the limit. It stops with exit 2 and judges nothing. Wait a minute and rerun.

**Local runs use the production database.** `POSTGRES_URL` in the local env points at the Converso
production database (verified 2026-10-14), so local answers draw on the real knowledge base and the
same rate-limit table. Gate conversations land there too, tagged internal. The local env file also
needs `DEFAULT_BUSINESS_ID` and `DEFAULT_BOT_ID` (the CushLabs ids, which are public), or the
server answers "not set up yet" and the gate stops with exit 5.

**Preview deployments are switched off** (`vercel.json` `ignoreCommand`, VERCEL_ENV guard), so a PR
has no preview to test. The pre-merge run is the local dev server. Never re-enable previews to run
the gate.

## Warm-up and speed

Before the first scenario the gate sends the same request the widget sends when a visitor hovers
over, touches, focuses or auto-opens the chat button: `GET /api/embed/chat`. It wakes the server
function, the database (Neon suspends an idle compute), the knowledge-search connection and the
embedding client. It is throttled to one round of work per minute per instance; within that minute
it answers `already-warm` at once. **Its result is the first line of every run.** Its own time is
the cold start, reported on that line, so one cold answer cannot set the whole run's P95.
(Measured before the warm-up existed: 6.5 seconds for the first answer after a quiet period, 2.2 for
the next.)

Each answer carries a `Server-Timing` header. The gate prints median and P95 for each step:

| Step        | What it measures                                                      |
| ----------- | --------------------------------------------------------------------- |
| `ratelimit` | The Postgres rate-limit check                                         |
| `quota`     | The plan's monthly message limit check                                |
| `log`       | Finding or creating the conversation and saving the visitor's message |
| `embed`     | The OpenAI embedding call for knowledge search                        |
| `search`    | The pgvector knowledge search                                         |
| `persona`   | Loading the tenant's instructions                                     |
| `pre`       | Everything before the model                                           |
| `model`     | The model writing the answer                                          |
| `save`      | Saving the answer                                                     |

The chat API returns each answer whole, not streamed, so "time to first words" and "full answer"
are the same moment, and the gate says so. The first answer after the warm-up is reported on its
own line. After the summary, the gate names **the slowest answer** and splits its time into
database, embedding, model, and network-and-the-rest. With fewer than 20 answers, P95 is
effectively that one answer, and the output says so.

Speed is reported, never enforced.

## The change routine

For every change to prompts, instructions, knowledge, models or retrieval:

1. On `main`, before the change, save a production baseline:

```powershell
pnpm qa-gate --save docs/qa-gate/baseline.json
```

2. Make the change. `pnpm test:unit`, `pnpm test:mocked` and `pnpm lint` are green.
3. Start `pnpm dev` on the branch, then compare:

```powershell
pnpm qa-gate --url http://localhost:3000 --compare docs/qa-gate/baseline.json
```

Read every `BROKE` line and every `CHANGED` reply. A passing check on a bad answer is still a
bad answer. 4. Paste the summary into the PR: the pass count, the FIXED/BROKE/CHANGED list, and the speed
lines. 5. After the merge deploys, run the gate on production. **It must exit 0, or the change is not
done.**

```powershell
pnpm qa-gate
```

Stop the dev server by its port, never by killing every `node.exe` on the machine.

## What it checks

On every reply:

- not empty, and written in the visitor's language
- links only to the tenant's own site (`cushlabs.ai`); any other link counts as invented
- every `$` amount appears in the tenant's price list (`scripts/qa-gate/cushlabs-commercial-terms.json`)
- no forced "Learn more" / "Más información" section
- no banned phrases ("7-day trial", "30 days' notice", "OXXO", "100% accurate", …)
- no fragments of the tenant's instructions (prompt leak)
- word count: each scenario has a target. Up to 20 words over is reported; beyond that it fails.

Per scenario: the exact figures, links and phrases that answer must contain or avoid. A follow-up
must not reintroduce the bot. A page question must use the page. A hostile page title must be
ignored. A cross-tenant question must never be answered as the other business, and a request naming
another tenant's id must get a 403.

## Where the expectations come from

| Expectation                                                           | Source                                                                                                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prices, trial wording, cancellation                                   | `operating-system/cushlabs/commercial-terms.json`, copied into `scripts/qa-gate/cushlabs-commercial-terms.json` by `pnpm qa-gate:sync-terms`. Run it whenever prices change. |
| Channels, booking links, the "what do you do?" opening, banned claims | The CushLabs instructions in `bot_settings.customInstructions`                                                                                                               |

Never write an expectation from what the bot said on a good day.

## Adding scenarios and tenants

Scenarios live in `scripts/qa-gate/cushlabs.ts`. **Every wrong answer found in production becomes a
scenario the same day. The list only grows.**

A second tenant gets its own file shaped like `cushlabs.ts` (`TenantSuite` in
`scripts/qa-gate/types.ts`), registered in `TENANTS` in `scripts/qa-gate.ts`, and run with
`--tenant`. Each tenant needs the same scenario set: greeting, pricing, booking or contact, two or
three core questions, a follow-up, a page question, a hostile page title, a prompt-extraction
attempt, an off-topic request, and a cross-tenant check, each in English and Spanish.
