import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  customType,
  foreignKey,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

// ===========================================
// ENUMS
// ===========================================

export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "canceled",
  "past_due",
  "incomplete",
]);

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "annual"]);

// Custom vector type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// ===========================================
// USER (will be synced from Clerk via webhook after Phase 2)
// ===========================================

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  // Clerk integration (Phase 2) - will be required after migration
  clerkUserId: varchar("clerk_user_id", { length: 100 }).unique(),
  email: varchar("email", { length: 255 }).notNull(),
  // DEPRECATED: password field - will be removed after Clerk migration
  password: varchar("password", { length: 64 }),
  name: varchar("name", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  locale: varchar("locale", { length: 5 }).default("es"), // 'en' or 'es'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const business = pgTable("Business", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type Business = InferSelectModel<typeof business>;

export const membership = pgTable("Membership", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  businessId: uuid("businessId")
    .notNull()
    .references(() => business.id),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  role: membershipRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Membership = InferSelectModel<typeof membership>;

export const bot = pgTable("Bot", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  businessId: uuid("businessId")
    .notNull()
    .references(() => business.id),
  name: text("name").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type Bot = InferSelectModel<typeof bot>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// Knowledge base documents for RAG
export const documents = pgTable("Document_Knowledge", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  url: varchar("url", { length: 500 }),
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI embeddings are 1536 dimensions
  metadata: text("metadata"), // Store JSON metadata
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type KnowledgeDocument = InferSelectModel<typeof documents>;

// Bot settings for customization
export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  botName: varchar("botName", { length: 100 }),
  customInstructions: text("customInstructions"),
  starterQuestions: jsonb("starterQuestions").$type<
    Array<{ id: string; question: string; emoji?: string }>
  >(),
  colors: jsonb("colors").$type<{
    primary?: string;
    background?: string;
    userMessage?: string;
  }>(),
  settings: jsonb("settings").$type<{
    showTimestamps?: boolean;
    showCitations?: boolean;
    language?: string;
  }>(),
  embedSettings: jsonb("embedSettings").$type<{
    buttonColor?: string;
    buttonSize?: number;
    position?: "bottom-right" | "bottom-left";
    welcomeMessage?: string;
    placeholder?: string;
    botIcon?: string;
    suggestedQuestions?: string[];
  }>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type BotSettings = InferSelectModel<typeof botSettings>;

// ===========================================
// BILLING & SUBSCRIPTIONS (Stripe integration)
// ===========================================

// Subscription Plans
export const plan = pgTable("Plan", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(), // 'free', 'starter', 'pro', 'business'
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull(), // cents USD
  priceAnnual: integer("price_annual").notNull(), // cents USD (annual total)
  stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 100 }),
  stripePriceIdAnnual: varchar("stripe_price_id_annual", { length: 100 }),
  // Limits
  messagesPerMonth: integer("messages_per_month").notNull(),
  knowledgeBasePagesLimit: integer("knowledge_base_pages_limit").notNull(),
  chatbotsLimit: integer("chatbots_limit").notNull(),
  teamMembersLimit: integer("team_members_limit").notNull(),
  // Features (array of feature strings)
  features: jsonb("features").$type<string[]>().notNull(),
  // Flags
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false), // The free tier
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Plan = InferSelectModel<typeof plan>;

// Business Subscriptions
export const subscription = pgTable("Subscription", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),
  planId: uuid("plan_id")
    .notNull()
    .references(() => plan.id),
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  trialEndsAt: timestamp("trial_ends_at"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Subscription = InferSelectModel<typeof subscription>;

// Usage Tracking (monthly aggregates)
export const usageRecord = pgTable("UsageRecord", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => business.id),
  month: varchar("month", { length: 7 }).notNull(), // 'YYYY-MM'
  messagesCount: integer("messages_count").notNull().default(0),
  tokensUsed: integer("tokens_used").notNull().default(0),
  knowledgeBasePagesCount: integer("knowledge_base_pages_count")
    .notNull()
    .default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UsageRecord = InferSelectModel<typeof usageRecord>;
