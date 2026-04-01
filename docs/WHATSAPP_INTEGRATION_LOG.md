# WhatsApp Integration — Progress Log

## Overview
Integrating Vercel Chat SDK to add WhatsApp (and future multi-channel) support to Converso AI. This is a strategic initiative to differentiate in the Mexico market where WhatsApp is the dominant business communication channel.

## Key Decisions
- **SDK:** Vercel Chat SDK (`chat` + `@chat-adapter/whatsapp`)
- **State:** PostgreSQL adapter (`@chat-adapter/state-pg`) — reuses existing database
- **WhatsApp Provider:** TBD — Robert has existing Twilio account with WhatsApp experience from other projects (stock alerts, monitoring). Evaluating direct Meta Cloud API vs Twilio.
- **Branch:** `feat/whatsapp-chat-sdk`

## Progress

### 2026-03-31 — Project Kickoff & Initial Prototype
- Researched Vercel Chat SDK architecture, adapter pattern, WhatsApp adapter capabilities
- Researched WhatsApp Business API pricing for Mexico (~$0.004/conversation, first 1K free)
- Analyzed competitive landscape — no Mexican SMB competitor offers RAG-powered AI + bilingual + WhatsApp
- Created feature branch `feat/whatsapp-chat-sdk`
- Installed packages: `chat`, `@chat-adapter/whatsapp`, `@chat-adapter/state-pg`
- **Schema changes:**
  - Added `conversation_channel` enum (web, whatsapp, slack, teams)
  - Added `channel` and `phone_number` columns to `WidgetConversation`
  - Made `visitor_id` and `session_id` nullable (WhatsApp uses phone numbers)
  - Created `WhatsappPhoneMapping` table (maps WhatsApp Business phone → businessId)
  - Generated migration `0012_big_frank_castle.sql`
- **New files:**
  - `lib/channels/bot.ts` — Chat SDK instance with WhatsApp adapter + PG state
  - `lib/channels/whatsapp-handler.ts` — Message handler wired to existing AI pipeline (knowledge search, playbooks, language detection, billing)
  - `app/api/webhooks/[platform]/route.ts` — Dynamic webhook route (GET verification + POST messages)
- Updated CLAUDE.md with new structure, env vars, and active initiative pointer

## Architecture Notes
- Chat SDK sits alongside Vercel AI SDK (already in use) — handles messaging transport, not LLM calls
- WhatsApp adapter: webhook-based, supports text/media/interactive buttons, no streaming (messages buffer and send complete)
- Multi-tenant: each client business will need their own WABA + phone number
- Existing pipeline (knowledge search, playbooks, lead capture) stays the same — Chat SDK adds a new transport layer

## Pricing Tier Strategy (Proposed)
- **Starter:** Web widget only
- **Pro:** Web widget + WhatsApp
- **Business:** Web widget + WhatsApp + Slack/Teams + priority support
