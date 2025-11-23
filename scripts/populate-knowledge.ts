import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { documents } from "../lib/db/schema";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.development.local" });
config({ path: ".env.local" });
config({ path: ".env" });

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function addDocument(
  content: string,
  url: string,
  metadata: any = {}
) {
  try {
    // Create embedding
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: content,
    });

    // Insert into database
    await db.insert(documents).values({
      content,
      url,
      embedding: embedding as any, // Cast to any for custom vector type
      metadata: JSON.stringify(metadata),
    });

    console.log(`✅ Added: ${metadata.type || url}`);
  } catch (error) {
    console.error(`❌ Failed to add document:`, error);
  }
}

async function populateKnowledgeBase() {
  console.log("🚀 Starting knowledge base population...\n");

  // Enable pgvector extension
  try {
    await client.unsafe("CREATE EXTENSION IF NOT EXISTS vector");
    console.log("✅ pgvector extension enabled\n");
  } catch (error) {
    console.log("⚠️  pgvector extension may already exist\n");
  }

  // Services Overview
  await addDocument(
    `New York English Teacher offers personalized English coaching for executives and business professionals. 
    Services include:
    - 1-on-1 Coaching: Personalized lessons aligned with real-world business challenges. Lessons are built around your job and specific goals.
    - Corporate Training: Individual coaching for teams and executives to improve Business English communication.
    - Interview Preparation: Mock interviews with targeted feedback on pronunciation, phrasing, and tone.
    - Business Presentations: Hands-on practice with structure templates and real presentation scenarios.
    
    A free 30-minute coaching session is available to start.`,
    "https://www.nyenglishteacher.com",
    { type: "services-overview", language: "en" }
  );

  // Target Audience
  await addDocument(
    `Target clients for New York English Teacher:
    - Executives and business professionals who need to communicate effectively in English
    - Professionals preparing for interviews, client meetings, or presentations
    - Companies wanting to train their teams in Business English
    - Spanish speakers building confidence in English business communication
    - Entrepreneurs and business leaders who need practical, real-world English skills
    
    The coaching is NOT academic English - it's focused on practical business communication.`,
    "https://www.nyenglishteacher.com",
    { type: "target-audience", language: "en" }
  );

  // Coaching Approach
  await addDocument(
    `New York English Teacher's coaching approach:
    - Lessons built around the client's job and specific professional goals
    - Clear, on-the-spot feedback on pronunciation, phrasing, and tone
    - Practice real business tasks: presentations, client calls, reports, emails
    - Structured yet flexible approach tailored to professional needs
    - Focus on building confidence for business meetings and presentations
    - Helps with career advancement through better English communication
    
    Proven results with executives from companies like CEVA Logistics, Driscoll's, and Smarttie.`,
    "https://www.nyenglishteacher.com",
    { type: "coaching-approach", language: "en" }
  );

  // Pricing Information
  await addDocument(
    `Pricing for New York English Teacher services:
    - Pricing details are discussed during the free 30-minute consultation
    - The consultation helps determine the best coaching plan for your specific needs
    - Flexible packages available for individuals and corporate teams
    - Investment varies based on coaching frequency and specific goals
    
    To learn about pricing, book a free 30-minute coaching session to discuss your needs.`,
    "https://www.nyenglishteacher.com",
    { type: "pricing", language: "en" }
  );

  // Spanish Version - Services
  await addDocument(
    `New York English Teacher ofrece coaching personalizado de inglés para ejecutivos y profesionales de negocios.
    Los servicios incluyen:
    - Coaching 1-a-1: Lecciones personalizadas alineadas con desafíos empresariales del mundo real.
    - Capacitación Corporativa: Coaching individual para equipos y ejecutivos.
    - Preparación para Entrevistas: Entrevistas simuladas con retroalimentación específica.
    - Presentaciones de Negocios: Práctica práctica con plantillas de estructura.
    
    Hay disponible una sesión de coaching gratuita de 30 minutos para comenzar.`,
    "https://www.nyenglishteacher.com",
    { type: "services-overview", language: "es" }
  );

  // Spanish Version - Target Audience
  await addDocument(
    `Clientes objetivo de New York English Teacher:
    - Ejecutivos y profesionales de negocios que necesitan comunicarse en inglés
    - Profesionales que se preparan para entrevistas, reuniones con clientes o presentaciones
    - Empresas que desean capacitar a sus equipos en inglés de negocios
    - Hispanohablantes que desarrollan confianza en la comunicación empresarial en inglés
    
    El coaching NO es inglés académico - está enfocado en comunicación empresarial práctica del mundo real.`,
    "https://www.nyenglishteacher.com",
    { type: "target-audience", language: "es" }
  );

  // Spanish Version - Pricing
  await addDocument(
    `Precios de los servicios de New York English Teacher:
    - Los detalles de precios se discuten durante la consulta gratuita de 30 minutos
    - La consulta ayuda a determinar el mejor plan de coaching para sus necesidades específicas
    - Paquetes flexibles disponibles para individuos y equipos corporativos
    
    Para conocer los precios, reserve una sesión de coaching gratuita de 30 minutos.`,
    "https://www.nyenglishteacher.com",
    { type: "pricing", language: "es" }
  );

  // FAQ - Levels and Backgrounds
  await addDocument(
    `What levels and backgrounds does New York English Teacher work with?
    Robert works with intermediate and advanced learners—busy professionals in business, law, medicine, logistics, engineering, and other fields. 
    He does not teach absolute beginners. The coaching is designed for professionals who already have a foundation in English and want to improve their business communication skills.`,
    "https://www.nyenglishteacher.com/faq",
    { type: "faq-levels", language: "en" }
  );

  // FAQ - Lesson Content
  await addDocument(
    `What do New York English Teacher lessons cover?
    Lessons focus on:
    - Speaking English with confidence in professional settings
    - Work scenarios: meetings, presentations, client calls
    - Pronunciation, phrasing, and professional tone
    - Interview preparation
    - General business communication skills
    
    All lessons are customized to your specific job and professional goals.`,
    "https://www.nyenglishteacher.com/faq",
    { type: "faq-content", language: "en" }
  );

  // FAQ - How Classes Work
  await addDocument(
    `How do New York English Teacher classes work?
    - Private 60-minute sessions conducted online via Google Meet
    - Each session includes: warm-up, targeted practice, on-the-spot feedback, and small talk
    - Customized PDF notes are delivered after each class
    - Lessons are personalized to your job and specific professional needs
    - Flexible scheduling available`,
    "https://www.nyenglishteacher.com/faq",
    { type: "faq-how-it-works", language: "en" }
  );

  // FAQ - Scheduling
  await addDocument(
    `How to schedule or reschedule lessons with New York English Teacher:
    - Send a message on WhatsApp
    - Email Robert directly
    - Call directly
    
    Important: Please give at least 24 hours' notice to reschedule and avoid any fees.`,
    "https://www.nyenglishteacher.com/faq",
    { type: "faq-scheduling", language: "en" }
  );

  // FAQ - Pricing Details
  await addDocument(
    `New York English Teacher pricing:
    - Students in Mexico: 500 MXN per hour
    - Students in the USA: 25 USD per hour
    - Senior leadership training: Custom pricing (contact for proposal)
    
    Payment (individuals): Due before each session via Zelle or bank transfer
    Companies: Monthly invoicing available`,
    "https://www.nyenglishteacher.com/faq",
    { type: "faq-pricing-details", language: "en" }
  );

  // FAQ - Senior Leadership
  await addDocument(
    `Does New York English Teacher offer training for senior leadership?
    Yes! Robert designs custom workshops and private coaching sessions specifically for senior leaders and executives.
    Contact him directly for a customized proposal and pricing tailored to your organization's needs.`,
    "https://www.nyenglishteacher.com/faq",
    { type: "faq-leadership", language: "en" }
  );

  // FAQ - Progress Timeline
  await addDocument(
    `How fast will I improve with New York English Teacher coaching?
    Most students see clear progress within 3-5 sessions.
    
    Improvement depends on:
    - Practice outside of class
    - Lesson frequency
    - Self-discipline
    - Your personal goals
    
    The coaching is designed to deliver practical, real-world results quickly.`,
    "https://www.nyenglishteacher.com/faq",
    { type: "faq-progress", language: "en" }
  );

  // FAQ - Cancellation Policy
  await addDocument(
    `New York English Teacher cancellation and payment policy:
    
    Attendance:
    - Robert waits up to 15 minutes after the start time
    - After 15 minutes, the lesson is considered a no-show and the fee applies
    
    Cancellations:
    - Require 24 hours' notice to avoid fees
    
    Payment:
    - Individuals: Payment due before each session via Zelle or bank transfer
    - Companies: Monthly invoicing available`,
    "https://www.nyenglishteacher.com/faq",
    { type: "faq-policy", language: "en" }
  );

  console.log("\n✅ Knowledge base populated successfully!");
  console.log("📊 Total documents added: 15");

  await client.end();
}

populateKnowledgeBase().catch((error) => {
  console.error("❌ Error populating knowledge base:", error);
  process.exit(1);
});
