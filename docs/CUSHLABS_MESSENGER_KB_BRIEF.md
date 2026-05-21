# CushLabs Messenger — Knowledge Base Spec (brief for the Messenger assistant)

**Purpose:** Hand this file to the AI assistant working on the CushLabs Messenger project. It describes a knowledge-base design pattern proven in Converso AI (the sibling Postgres-based SaaS), adapted for Messenger's Cloudflare Workers + KV stack. The point is to lift the _patterns_, not copy the code — Converso uses Postgres + pgvector; Messenger should use Cloudflare KV (+ optionally Vectorize) to stay native to its runtime.

**Reference repo:** `../ai-chatbot-saas/` (Converso AI). When this brief says "see Converso's X" the assistant can read that file directly to study the pattern.

---

## 1. Why this exists

Robert is collecting structured questionnaire data from CushLabs clients (business basics, locations, hours, etc.) and wants the Messenger bot to answer questions using **both**:

- **Structured business knowledge** — the facts a customer asks for verbatim: store hours, addresses, phone numbers, manager names. Multi-location businesses need this most.
- **Unstructured business knowledge** — FAQs, policies, "do you do X?" type questions where the answer lives in prose.

Converso solved this for websites. The same pattern works for Messenger with one Cloudflare-native swap.

---

## 2. Patterns to lift from Converso

### Pattern A — Two-tier knowledge: structured + chunks

Converso has a `Business` table (the tenant) plus a `KnowledgeChunk` table (the embedded prose). The bot retrieves both: it looks up structured fields directly, and it does similarity search over chunks. Compose both into the system prompt.

**Why this matters for Messenger:** customers asking "what are your hours?" should get a verbatim answer from the structured store hours field, not a fuzzy RAG retrieval over a marketing paragraph that might say "we're open most days."

### Pattern B — Multi-tenant scoping everywhere

Every Converso DB query filters by `businessId`. There is no path to read another tenant's data — this is enforced at the query layer, not in app code. See Converso's `lib/ai/tools/search-knowledge.ts` (`isUuid` gate + parameterized SQL filter on `business_id`).

**For Messenger:** every KV key must be tenant-prefixed (e.g. `business:{businessId}:locations`). Never key by just the resource — always prepend the tenant.

### Pattern C — Content-hash incremental ingest

Converso hashes each chunk's content (SHA-256) and skips embedding chunks it has already processed for that business. A 1000-page site where one page changed pays for one re-embedding, not 1000. See Converso's `app/api/admin/knowledge/ingest/route.ts` (the `seenHashes` / `existingHashes` logic).

**For Messenger:** if the same questionnaire is re-submitted with one field changed, only re-embed the affected chunk. Hash before embed.

### Pattern D — Output safety guard

Converso runs an output guard on every model response to refuse leaks of the system prompt / scaffolding. See Converso's `lib/ai/safety/output-guard.ts`. The guard returns a safe fallback message in the user's language when it triggers.

**For Messenger:** same idea, same guard rails. Messenger users can't see the system prompt either.

### Pattern E — Bilingual EN/ES handling

Converso detects language per turn (`lib/utils/language-detector.ts`) and switches model output / fallback strings accordingly. Mexico audience.

**For Messenger:** same — and if you're hitting Mexico market, default to es-MX (per CLAUDE.md global rule).

---

## 3. Proposed data model

This is the model the Messenger assistant should implement. Names match the Converso conventions where they overlap.

### 3a. `Business` — top-level tenant record

```typescript
type Business = {
  id: string; // UUID
  name: string; // "El Patrón Tacos"
  industry?: string; // "restaurant"
  defaultLanguage: "es" | "en";

  // Brand-level facts that apply across all locations
  websiteUrl?: string;
  generalEmail?: string;
  generalPhone?: string;
  socialHandles?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };

  // System prompt persona/tone (filled from questionnaire)
  brandVoice?: string; // "warm, casual, family-friendly"
  refusalRules?: string[]; // ["don't quote prices over $500", "always refer plumbing to a human"]

  createdAt: string;
  updatedAt: string;
};
```

**KV key:** `business:{businessId}` → JSON-stringified Business.

### 3b. `Location` — one per physical location

This is the structured record Robert specifically called out. Each business can have N locations.

```typescript
type Location = {
  id: string; // UUID
  businessId: string; // FK
  storeName: string; // "El Patrón Downtown"
  storeNumber?: string; // "Store #4" or internal location ID
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string; // ISO-2, default "MX"
  };
  phone: string; // E.164 format: "+525551234567"
  managerName?: string;
  managerEmail?: string;
  hours: BusinessHours;
  services?: string[]; // ["dine-in", "takeout", "delivery"]
  notes?: string; // free-text notes (e.g. "closed for renovations until June")
  active: boolean; // soft delete
  createdAt: string;
  updatedAt: string;
};

type BusinessHours = {
  // ISO weekday names, lowercase
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  // Optional one-off overrides for holidays
  overrides?: Array<{
    date: string;
    hours: DayHours | "closed";
    reason?: string;
  }>;
};

type DayHours = {
  closed: boolean;
  open?: string; // "09:00" 24h format
  close?: string; // "21:00"
  // Optional split day (lunch break, siesta, etc.)
  splits?: Array<{ open: string; close: string }>;
};
```

**KV keys:**

- `business:{businessId}:location:{locationId}` → JSON Location
- `business:{businessId}:locations:index` → JSON `string[]` of location IDs (for fast listing)

### 3c. `KnowledgeChunk` — unstructured prose chunks

```typescript
type KnowledgeChunk = {
  id: string;
  businessId: string;
  locationId?: string; // optional — chunk applies to a specific location
  content: string; // ~500–1500 chars
  contentHash: string; // SHA-256 hex (for incremental ingest)
  embedding?: number[]; // if using Vectorize
  source: {
    type: "questionnaire" | "website" | "pdf" | "manual";
    questionnaireField?: string; // e.g. "menu_description"
    url?: string;
  };
  language: "es" | "en";
  createdAt: string;
};
```

**KV keys:**

- `business:{businessId}:chunk:{chunkId}` → JSON KnowledgeChunk
- `business:{businessId}:chunks:hashes` → JSON `string[]` of contentHashes (fast dedup lookup)

If using **Cloudflare Vectorize** (recommended for similarity search), the embedding lives in Vectorize indexed by `{businessId}:{chunkId}` and KV stores the metadata.

---

## 4. Questionnaire → ingest pipeline

This is the new piece Robert wants. Customer fills out a structured questionnaire; the system splits it into the right buckets automatically.

### 4a. Questionnaire schema

Design the questionnaire with **typed sections** so each answer knows where it goes:

```typescript
type Questionnaire = {
  // Section A — structured Business fields
  businessName: string;
  industry: string;
  websiteUrl?: string;
  generalEmail?: string;
  socialHandles?: { facebook?: string; instagram?: string; whatsapp?: string };
  brandVoice?: string;

  // Section B — locations (array, even if just 1)
  locations: Array<{
    storeName: string;
    storeNumber?: string;
    address: {...};
    phone: string;
    managerName?: string;
    hours: BusinessHours;
    services?: string[];
    notes?: string;
  }>;

  // Section C — unstructured prose (becomes KnowledgeChunks)
  faqs?: Array<{ question: string; answer: string }>;
  policies?: { returns?: string; shipping?: string; cancellations?: string };
  menuOrServices?: string;     // free-text description
  uniqueSellingPoints?: string;
  thingsToAvoid?: string;      // refusal rules
};
```

### 4b. Ingest flow

```
1. Validate questionnaire (zod schema).
2. Write/update Business record from Section A.
3. For each location in Section B:
   a. Upsert Location record.
   b. Generate one structured-summary chunk per location for retrieval
      ("El Patrón Downtown is at {address}, phone {phone}, open {hours},
      manager {managerName}.") and embed it.
4. For each item in Section C:
   a. Chunk if long; otherwise keep as-is.
   b. Hash content. Skip if hash already exists for this business.
   c. Embed new chunks. Save to KV + Vectorize.
5. Track ingest summary: { chunksCreated, chunksReused, locationsUpdated }.
6. Return the summary so the admin UI can show progress.
```

The "structured-summary chunk per location" pattern is important: it makes location facts retrievable via the same RAG pipeline as the rest, so the bot answers "what time does the downtown store close?" naturally.

---

## 5. Retrieval — what the bot does at message time

When a Messenger user sends a message:

```
1. Detect language (es/en).
2. If the message mentions a specific location ("downtown", "store 4",
   any address keyword), narrow retrieval to that location's chunks.
3. Otherwise: vector-similarity search over all chunks for this business
   (top K=5, similarity threshold ~0.4 — matches Converso's setting).
4. Build the system prompt:
     - Brand voice & refusal rules (from Business record)
     - Top-K retrieved chunks
     - If a specific location was identified, include its full structured
       record in the prompt verbatim (don't trust RAG for facts that
       have an authoritative source)
5. Generate response with Workers AI or upstream model of choice.
6. Run output safety guard. If triggered, return safe fallback in detected language.
7. If the user is in a handoff playbook flow, route through that engine
   (same 2-attempt cap + cancel-keywords pattern Converso uses — see
   Converso's lib/playbook/engine.ts).
```

**Key principle:** structured facts beat fuzzy retrieval. If the user is clearly asking about hours/address/phone for a specific location, look it up directly and inject the verbatim record into the system prompt. RAG is for ambiguous prose questions ("do you cater?"), not for facts you have in a structured field.

---

## 6. Multi-location handling specifics

Two scenarios to handle cleanly:

### 6a. Customer mentions a location explicitly

Match by:

1. Exact `storeName` substring (case-insensitive)
2. City name
3. Address fragment (street name)
4. Store number

Use the first non-ambiguous match. If multiple locations match, ask the user to clarify before answering location-specific questions.

### 6b. Customer doesn't specify a location

For questions where the answer differs per location ("what are your hours?"):

- If the business has only one location: answer from that location.
- If multiple: respond with a brief list ("We have 3 locations: Downtown, Polanco, Roma. Which one are you asking about?") rather than picking arbitrarily.
- For questions where the answer is brand-wide ("do you do takeout?", "are you halal?"): answer from the Business record / brand-wide chunks without location disambiguation.

This is a per-message classification step that's worth doing well. The bot looks smart when it asks the right clarifying question and dumb when it doesn't.

---

## 7. Cloudflare-specific implementation notes

These differ from Converso (which uses Postgres + pgvector):

### Storage choices

| Data                                   | Storage                                  | Why                                                                                                                                                   |
| -------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business record                        | KV                                       | Read-heavy, small, infrequent writes                                                                                                                  |
| Location records                       | KV (one key per location + an index key) | Same, with explicit index for listing                                                                                                                 |
| Chunk metadata (content, source, hash) | KV                                       | Sized for KV's 25 MB value limit                                                                                                                      |
| Chunk embeddings + similarity search   | **Vectorize**                            | KV can't do similarity search; Vectorize is purpose-built                                                                                             |
| Conversation history (recent)          | KV with TTL                              | Auto-expire after 24-48 hours                                                                                                                         |
| Conversation history (audit)           | D1 or external Postgres                  | Long-term storage if needed                                                                                                                           |
| Rate limit counters                    | **Durable Objects** (NOT KV)             | KV has race conditions on read-modify-write (Converso's `ARCHITECTURE_LEVERAGE_ANALYSIS.md` documents this); Durable Objects give you atomic counters |

### Worker entry points

The Messenger webhook handler should look roughly like:

```typescript
// src/index.ts (Workers entry)
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Verify Meta webhook signature (X-Hub-Signature-256)
    // 2. Parse Messenger event
    // 3. Resolve businessId from the page that received the message
    // 4. Rate-limit (Durable Object)
    // 5. Run retrieval + generate + safety guard
    // 6. Send response back via Meta Send API
  },
};
```

Keep the handler thin; push retrieval, generation, and safety into testable modules.

---

## 8. Migration path (if existing data)

If CushLabs Messenger already has business data in some form (raw KV blobs, scattered fields), do a one-time migration:

1. Audit existing KV keys, group by business.
2. Map old fields → new typed model (Business + Locations + Chunks).
3. Run the questionnaire ingest pipeline on the mapped data.
4. Verify retrieval works on a few real customer queries before cutting over.
5. Keep old keys for 30 days, then GC.

If starting fresh: skip this section, build the questionnaire UI first, ingest as customers fill it out.

---

## 9. What NOT to copy from Converso

Some Converso choices are wrong for the Messenger context:

- **Don't use Postgres** — Workers + Postgres adds a connection management problem (poolers, edge connectivity). Stay native: KV + Vectorize + Durable Objects.
- **Don't use Drizzle** — same reason. KV is schemaless JSON; just use TypeScript types as the contract.
- **Don't use Vercel AI SDK's `streamText`** — Messenger isn't streaming-native (users see one final message). Use Workers AI's `run()` or a single-shot OpenAI/Anthropic call.
- **Don't replicate the React admin UI** — Messenger admin is best as a separate web admin (could be a Next.js app on Vercel, or a simple Workers-served HTML form). The Worker itself just handles webhook traffic.

---

## 10. Reference files in Converso to study

The Messenger assistant should read these files directly for the pattern (even if not copying code 1:1):

- `lib/db/schema.ts` — see `business`, `knowledgeChunk`, especially the `content_hash` and `(business_id, content_hash)` index
- `app/api/admin/knowledge/ingest/route.ts` — see the streaming ingest with `seenHashes` / `existingHashes` / orphan cleanup
- `lib/ai/tools/search-knowledge.ts` — see the tenant-isolated similarity search with the `isUuid` gate
- `lib/ai/safety/output-guard.ts` — see the output guard pattern (replicate the idea, not the regex list)
- `lib/playbook/engine.ts` — see the cancel-keyword + 2-attempt-cap pattern
- `lib/utils/language-detector.ts` — see the EN/ES detection logic
- `lib/rate-limit.ts` — Converso uses Postgres sliding window; you'll use Durable Objects instead, but the _interface_ (drop-in returning a 429 or null) is the same shape

---

## 11. Definition of done for this work item

The Messenger assistant should consider this delivered when:

- [ ] Business + Location + KnowledgeChunk types defined and documented
- [ ] Questionnaire form (any UI — Notion, Google Form, web form) maps cleanly into the data model
- [ ] Ingest pipeline writes Business + Locations + structured-summary-chunks + free-text chunks
- [ ] Content-hash skip-existing logic in place (re-ingest is cheap)
- [ ] Retrieval at message time pulls verbatim location records when the user names a location, RAG otherwise
- [ ] Output safety guard returns bilingual fallback on system-prompt leak
- [ ] Multi-location clarifying-question logic works (test: ask "what are your hours?" on a 3-location business)
- [ ] All KV keys are tenant-prefixed; no path exists to read another tenant's data
- [ ] Workers AI / model calls are observable (log + Sentry) so misbehaviors surface fast

---

## Notes for Robert

If your CushLabs Messenger assistant gets stuck on any specific pattern, the fastest unblock is to point it at the Converso file referenced in section 10. The patterns are battle-tested under real multi-tenant load in Converso; the Messenger version just needs to substitute Cloudflare-native storage for the Postgres equivalents.
