---

## 7. Recommended Tech Stack (v1)

### Frontend
- Next.js (App Router)  
- React + Tailwind  
- shadcn/ui  
- English / Spanish UI  
- WebSockets for preview  

### Backend
- Node.js (TypeScript)  
- Fastify or NestJS  
- REST (GraphQL optional for admin)  
- Zod validation  

### Data & Storage
- Postgres (Supabase / Neon)  
- Vector DB (Supabase Vector, Pinecone, Qdrant)  
- S3-compatible object storage  

### AI
- OpenAI / Anthropic / Gemini (via router)  
- Embeddings: `text-embedding-3-large`  
- Vision models for image text extraction  
- No fine-tuning in v1  

---

## 8. AI Strategy (v1)

### Model Routing

- Cheap + fast → intent detection
- Mid-tier → responses
- Premium → sales moments only

### Language Layer

- Detect per message
- Normalize internally
- Respond in same language
- Maintain tone parity

### Brand Voice Engine

Extracts:

- Sentence length
- Formality
- Vocabulary
- Emotional tone

Used as:

- System prompt modifiers
- Cross-language consistency rules

---

## 9. Plans & Monetization Alignment

### Tier 1 — Self-Service

- 1 bot
- Limited agents
- Basic knowledge ingestion
- Basic multilingual

### Tier 2 — Advanced

- Multiple bots
- Sales assistance
- Brand voice controls
- CRM hooks
- Analytics

### Tier 3 — White-Glove

- Custom agents
- Custom flows
- Assisted ingestion
- SLA & priority support

---

## 10. Security & Compliance (v1)

- Tenant isolation
- Encrypted storage
- API key scoping
- Rate limiting
- Audit logs
- GDPR-ready deletion
- Prompt injection defense
- Jailbreak prevention

---

## 11. Roadmap (Phased)

**Phase 1 — Foundation**  
Auth, billing, bot creation, basic chat

**Phase 2 — Knowledge & RAG**  
Uploads, vector store, retrieval, insights

**Phase 3 — Multilingual & Brand Voice**  
Language detection, translation, tone

**Phase 4 — Mini Agents**  
Appointments, quotes, CRM

**Phase 5 — Sales Assistance**  
Objections, handoff, payments

**Phase 6 — Scale & Polish**  
Analytics, cost controls, enterprise readiness
