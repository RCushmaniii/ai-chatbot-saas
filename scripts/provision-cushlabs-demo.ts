/**
 * Provision the CushLabs demo tenant for the homepage embed.
 *
 * Idempotent: uses fixed UUIDs and upserts, so re-running refreshes the
 * persona + knowledge without creating duplicates.
 *
 * Creates: owner User, "CushLabs" Business, owner Membership, Bot,
 * botSettings (CushLabs persona as customInstructions + starter questions),
 * a subscription on the highest-limit plan, and a ContentSource + a set of
 * embedded KnowledgeChunk rows (the grounded RAG knowledge base).
 *
 * Run:  node --env-file=.env.local node_modules/.bin/tsx scripts/provision-cushlabs-demo.ts
 *   or: pnpm tsx scripts/provision-cushlabs-demo.ts   (dotenv loads .env.local below)
 *
 * Prints CUSHLABS_BUSINESS_ID / CUSHLABS_BOT_ID for the Vercel env config.
 */
import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { config as dotenvConfig } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	bot,
	botSettings,
	business,
	contentSource,
	knowledgeChunk,
	membership,
	plan,
	subscription,
	user,
} from "../lib/db/schema";

dotenvConfig({ path: ".env.development.local" });
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Fixed IDs → idempotent re-runs + stable env config.
const USER_ID = "c051ab50-0000-4000-a000-000000000001";
const BUSINESS_ID = "c051ab50-0000-4000-a000-000000000002";
const BOT_ID = "c051ab50-0000-4000-a000-000000000003";
const SOURCE_ID = "c051ab50-0000-4000-a000-000000000004";

const CUSHLABS_PERSONA = `You are the live demo assistant on the CushLabs.ai homepage. CushLabs is an AI engineering studio run by Robert Cushman III, a bilingual (EN/ES) developer with 30 years in IT, based in Guadalajara and serving clients in Mexico and the U.S.

YOUR JOB: Demonstrate exactly what a CushLabs-built assistant feels like — clear, honest, helpful — so a prospect experiences the product before they buy it.

PERSONALITY: Warm, direct, concise. You are confident about what CushLabs delivers and honest about what you don't know. You never invent facts.

LANGUAGE: Reply in the same language the user writes in (English or Mexican Spanish). Handle mid-conversation switches.

LENGTH: 2–4 sentences. No filler.

GROUNDING (critical): For any question about CushLabs services, pricing, timelines, guarantee, process, or portfolio, you MUST answer from the knowledge base results provided in your context. If the knowledge base has no relevant result, say you're not certain and offer to connect them with Robert on a free call — do NOT guess. When knowledge results include a "(source: URL)", include that link in your answer.

CLOSING MOVE: After a few genuine exchanges, naturally invite them to book a free 30-minute call: English → https://www.cushlabs.ai/consultation/ , Spanish → https://www.cushlabs.ai/es/reservar/ . Frame it as: "what you just experienced is what your customers would get, 24/7, in two languages."

OUT OF SCOPE: If asked something unrelated to AI systems for business, politely steer back — you're a focused demo of CushLabs' AI services.`;

type Chunk = {
	content: string;
	url: string;
	title: string;
	language: "en" | "es";
};

const KNOWLEDGE: Chunk[] = [
	{
		title: "Services overview",
		language: "en",
		url: "https://www.cushlabs.ai/services/",
		content: `CushLabs builds AI systems for small and mid-sized businesses: AI chatbots and assistants (for websites and Facebook Messenger), voice agents, and workflow automation. Every system is built to answer from content the client approves, in English and Spanish, and typically goes live in 2 to 6 weeks. The work is fixed-price and fixed-scope.`,
	},
	{
		title: "Pricing",
		language: "en",
		url: "https://www.cushlabs.ai/services/",
		content: `CushLabs projects start at $3,500 USD for a focused system such as a support or lead-capture chatbot. More complex work — voice agents, multi-system integrations, custom workflows — scales with scope. Robert gives an exact number in a free 30-minute call once he understands the specific case; pricing is fixed-price and fixed-scope, no open-ended hourly billing.`,
	},
	{
		title: "Timelines",
		language: "en",
		url: "https://www.cushlabs.ai/services/",
		content: `Most CushLabs projects go live in 2 to 6 weeks. A focused chatbot takes about 2–3 weeks; a voice agent with integrations takes about 4–6 weeks. Clients see working progress every week, not just at the end.`,
	},
	{
		title: "Hallucination / accuracy",
		language: "en",
		url: "https://www.cushlabs.ai/",
		content: `Accuracy is Robert's main design constraint. Every CushLabs assistant is built to answer only from content the client approves (retrieval-grounded), and to say "I don't know" and offer a human handoff rather than guess. All conversations are logged so the client can see exactly what to improve.`,
	},
	{
		title: "Guarantee",
		language: "en",
		url: "https://www.cushlabs.ai/",
		content: `CushLabs works in milestones: you pay for the first chunk, see it working, then pay the next. If you're not satisfied at any point, work stops and you keep what was delivered. After launch there's a 30-day window where Robert fixes anything not performing as agreed, at no extra cost.`,
	},
	{
		title: "Bilingual EN/ES",
		language: "en",
		url: "https://www.cushlabs.ai/",
		content: `Every CushLabs system is natively bilingual (English and Spanish) and handles mid-conversation language switches. Robert is a native-level bilingual developer, so Spanish copy reads as Mexican professional Spanish, not a machine translation.`,
	},
	{
		title: "Industries / fit",
		language: "en",
		url: "https://www.cushlabs.ai/",
		content: `CushLabs has deployed AI assistants for coaches, language schools, boutiques, and service businesses in the U.S. and Mexico. The best way to know if your case fits is a free 30-minute call where Robert tells you honestly — no pressure.`,
	},
	{
		title: "Portfolio highlights",
		language: "en",
		url: "https://www.cushlabs.ai/portfolio/",
		content: `Recent CushLabs work includes a voice AI platform with sub-500ms response times, a multi-tenant RAG chatbot SaaS, a Facebook Messenger assistant live for a New York English coaching business, and a local-SEO competitive-intelligence platform for multi-location businesses.`,
	},
	{
		title: "How to start / booking",
		language: "en",
		url: "https://www.cushlabs.ai/consultation/",
		content: `To start, book a free 30-minute call at https://www.cushlabs.ai/consultation/ . Robert learns your goals, tells you honestly whether it's a fit, and gives an exact fixed price and timeline. No obligation.`,
	},
	{
		title: "Servicios (resumen)",
		language: "es",
		url: "https://www.cushlabs.ai/es/",
		content: `CushLabs construye sistemas de IA para pequeñas y medianas empresas: chatbots y asistentes de IA (para sitios web y Facebook Messenger), agentes de voz y automatización de procesos. Cada sistema responde solo con contenido que el cliente aprueba, funciona en inglés y español, y normalmente queda en vivo en 2 a 6 semanas. El trabajo es a precio fijo y alcance fijo.`,
	},
	{
		title: "Precios",
		language: "es",
		url: "https://www.cushlabs.ai/es/",
		content: `Los proyectos de CushLabs comienzan en $3,500 USD para un sistema enfocado, como un chatbot de soporte o de captación de clientes. El trabajo más complejo —agentes de voz, integraciones múltiples— escala según el alcance. Robert da el número exacto en una llamada gratuita de 30 minutos una vez que entiende tu caso; es precio fijo, sin cobro por hora abierto.`,
	},
	{
		title: "Tiempos y garantía",
		language: "es",
		url: "https://www.cushlabs.ai/es/",
		content: `La mayoría de los proyectos quedan en vivo en 2 a 6 semanas y ves avances cada semana. Robert trabaja por hitos: pagas el primero, lo ves funcionando y luego sigues. Si no estás satisfecho, el trabajo se detiene. Después del lanzamiento hay 30 días para ajustar lo que no funcione como se acordó, sin costo extra.`,
	},
	{
		title: "Cómo empezar / agendar",
		language: "es",
		url: "https://www.cushlabs.ai/es/reservar/",
		content: `Para empezar, agenda una llamada gratuita de 30 minutos en https://www.cushlabs.ai/es/reservar/ . Robert conoce tus objetivos, te dice con honestidad si encaja, y te da un precio fijo y un tiempo exacto. Sin compromiso.`,
	},
];

async function main() {
	console.log("🚀 Provisioning CushLabs demo tenant...\n");

	await client.unsafe("CREATE EXTENSION IF NOT EXISTS vector");

	// Self-heal schema drift: this Neon DB predates a couple of KnowledgeChunk
	// columns present in schema.ts (the migration was never pushed here).
	// Additive + idempotent, so safe to run every time.
	await client.unsafe(
		'ALTER TABLE "KnowledgeChunk" ADD COLUMN IF NOT EXISTS content_hash varchar(64)',
	);
	await client.unsafe(
		'ALTER TABLE "KnowledgeChunk" ADD COLUMN IF NOT EXISTS token_count integer',
	);

	const now = new Date();

	// 1. Owner user
	await db
		.insert(user)
		.values({
			id: USER_ID,
			email: "demo-bot@cushlabs.ai",
			name: "CushLabs Demo",
			locale: "en",
		})
		.onConflictDoNothing();

	// 2. Business
	await db
		.insert(business)
		.values({
			id: BUSINESS_ID,
			name: "CushLabs",
			onboardingStatus: "active",
			onboardingStep: 99,
			createdAt: now,
		})
		.onConflictDoUpdate({
			target: business.id,
			set: { name: "CushLabs", onboardingStatus: "active" },
		});

	// 3. Owner membership
	await db
		.insert(membership)
		.values({ businessId: BUSINESS_ID, userId: USER_ID, role: "owner" })
		.onConflictDoNothing();

	// 4. Bot
	await db
		.insert(bot)
		.values({
			id: BOT_ID,
			businessId: BUSINESS_ID,
			name: "CushLabs AI Demo",
			createdAt: now,
		})
		.onConflictDoUpdate({ target: bot.id, set: { name: "CushLabs AI Demo" } });

	// 5. Bot settings (persona lives here — editable later via /admin Instructions)
	const existingSettings = await db
		.select({ id: botSettings.id })
		.from(botSettings)
		.where(eq(botSettings.userId, USER_ID))
		.limit(1);

	const settingsValues = {
		userId: USER_ID,
		botName: "CushLabs AI Demo",
		customInstructions: CUSHLABS_PERSONA,
		starterQuestions: [
			{ id: "1", question: "How much does it cost?", emoji: "💰" },
			{ id: "2", question: "How long does it take?", emoji: "⏱️" },
			{ id: "3", question: "¿Cómo funciona la garantía?", emoji: "✅" },
			{ id: "4", question: "Book a free call", emoji: "📅" },
		],
		embedSettings: {
			welcomeMessage:
				"👋 I'm the CushLabs demo assistant — the same kind of system Robert builds for clients. Ask me about services, pricing, timelines, or what you want to build. (EN/ES)",
			placeholder: "Type a message…",
			position: "bottom-right" as const,
		},
		updatedAt: now,
	};

	if (existingSettings.length > 0) {
		await db
			.update(botSettings)
			.set(settingsValues)
			.where(eq(botSettings.userId, USER_ID));
	} else {
		await db.insert(botSettings).values(settingsValues);
	}

	// 6. Subscription on the highest-limit active plan (so the demo never hits a cap)
	const plans = await db.select().from(plan).where(eq(plan.isActive, true));
	if (plans.length > 0) {
		const best = plans.sort(
			(a, b) => b.messagesPerMonth - a.messagesPerMonth,
		)[0];
		const existingSub = await db
			.select({ id: subscription.id })
			.from(subscription)
			.where(eq(subscription.businessId, BUSINESS_ID))
			.limit(1);
		if (existingSub.length === 0) {
			await db.insert(subscription).values({
				businessId: BUSINESS_ID,
				planId: best.id,
				status: "active",
			});
		}
		console.log(
			`✅ Subscription on plan "${best.name}" (${best.messagesPerMonth} msgs/mo)`,
		);
	} else {
		console.log(
			"⚠️  No plans seeded — run `pnpm tsx scripts/seed-plans.ts` if the demo hits a message limit.",
		);
	}

	// 7. Content source
	await db
		.insert(contentSource)
		.values({
			id: SOURCE_ID,
			businessId: BUSINESS_ID,
			botId: BOT_ID,
			type: "text",
			name: "CushLabs curated knowledge",
			status: "processed",
			pageCount: KNOWLEDGE.length,
			processedAt: now,
		})
		.onConflictDoUpdate({
			target: contentSource.id,
			set: { status: "processed", pageCount: KNOWLEDGE.length },
		});

	// 8. Knowledge chunks — clear old, re-embed, insert
	await db.delete(knowledgeChunk).where(eq(knowledgeChunk.sourceId, SOURCE_ID));

	let n = 0;
	for (const chunk of KNOWLEDGE) {
		const { embedding } = await embed({
			model: openai.embedding("text-embedding-3-small"),
			value: chunk.content,
		});
		await db.insert(knowledgeChunk).values({
			businessId: BUSINESS_ID,
			botId: BOT_ID,
			sourceId: SOURCE_ID,
			content: chunk.content,
			embedding: embedding as number[],
			metadata: {
				url: chunk.url,
				title: chunk.title,
				language: chunk.language,
			},
		});
		n++;
		console.log(
			`  ✅ [${n}/${KNOWLEDGE.length}] ${chunk.title} (${chunk.language})`,
		);
	}

	console.log(`\n🎉 Provisioned CushLabs demo with ${n} knowledge chunks.\n`);
	console.log("Set these on the Vercel project (Production):");
	console.log(`  DEFAULT_BUSINESS_ID=${BUSINESS_ID}`);
	console.log(`  DEFAULT_BOT_ID=${BOT_ID}`);

	await client.end();
}

main().catch((e) => {
	console.error("❌ Provisioning failed:", e);
	process.exit(1);
});
