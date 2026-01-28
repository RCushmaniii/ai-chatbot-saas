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
	},
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
	},
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
	},
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
	}),
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
	}),
);

export type Stream = InferSelectModel<typeof stream>;

// ===========================================
// KNOWLEDGE BASE (Multi-tenant RAG)
// ===========================================

// Content source types for ingestion pipeline
export const contentSourceTypeEnum = pgEnum("content_source_type", [
	"website",
	"pdf",
	"text",
	"paste",
]);

export const contentSourceStatusEnum = pgEnum("content_source_status", [
	"pending",
	"processing",
	"processed",
	"failed",
]);

// Content sources (what the tenant uploaded)
export const contentSource = pgTable("ContentSource", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	botId: uuid("bot_id").references(() => bot.id), // Optional: specific bot or all bots
	type: contentSourceTypeEnum("type").notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	url: varchar("url", { length: 500 }), // For website sources
	status: contentSourceStatusEnum("status").notNull().default("pending"),
	pageCount: integer("page_count").default(0),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	processedAt: timestamp("processed_at"),
});

export type ContentSource = InferSelectModel<typeof contentSource>;

// Knowledge chunks (tenant-isolated embeddings)
export const knowledgeChunk = pgTable("KnowledgeChunk", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	botId: uuid("bot_id").references(() => bot.id), // Optional: specific bot or all bots
	sourceId: uuid("source_id")
		.notNull()
		.references(() => contentSource.id),
	content: text("content").notNull(),
	embedding: vector("embedding"), // OpenAI text-embedding-3-small (1536 dimensions)
	metadata: jsonb("metadata").$type<{
		url?: string;
		title?: string;
		page?: number;
		section?: string;
		language?: string;
	}>(),
	tokenCount: integer("token_count"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type KnowledgeChunk = InferSelectModel<typeof knowledgeChunk>;

// Legacy: Knowledge base documents for RAG (kept for backwards compatibility)
export const documents = pgTable("Document_Knowledge", {
	id: serial("id").primaryKey(),
	businessId: uuid("business_id").references(() => business.id), // Added for tenant isolation
	content: text("content").notNull(),
	url: varchar("url", { length: 500 }),
	embedding: vector("embedding"), // OpenAI embeddings are 1536 dimensions
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
	starterQuestions:
		jsonb("starterQuestions").$type<
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

// ===========================================
// CONTACT/LEAD MANAGEMENT
// ===========================================

export const contactStatusEnum = pgEnum("contact_status", [
	"new",
	"engaged",
	"qualified",
	"converted",
]);

export const contact = pgTable("Contact", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	email: varchar("email", { length: 255 }),
	phone: varchar("phone", { length: 50 }),
	name: varchar("name", { length: 255 }),
	status: contactStatusEnum("status").notNull().default("new"),
	leadScore: integer("lead_score").default(0),
	tags: jsonb("tags").$type<string[]>().default([]),
	customFields: jsonb("custom_fields").$type<Record<string, string>>(),
	firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
	lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Contact = InferSelectModel<typeof contact>;

export const contactActivityTypeEnum = pgEnum("contact_activity_type", [
	"page_view",
	"chat_started",
	"message_sent",
	"email_captured",
	"phone_captured",
	"playbook_completed",
	"handoff_requested",
	"converted",
]);

export const contactActivity = pgTable("ContactActivity", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	contactId: uuid("contact_id")
		.notNull()
		.references(() => contact.id),
	type: contactActivityTypeEnum("type").notNull(),
	description: text("description"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ContactActivity = InferSelectModel<typeof contactActivity>;

export const widgetConversationStatusEnum = pgEnum(
	"widget_conversation_status",
	["active", "closed", "handed_off"],
);

export const widgetConversation = pgTable("WidgetConversation", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	botId: uuid("bot_id").references(() => bot.id),
	visitorId: varchar("visitor_id", { length: 100 }).notNull(),
	sessionId: varchar("session_id", { length: 100 }).notNull(),
	contactId: uuid("contact_id").references(() => contact.id),
	status: widgetConversationStatusEnum("status").notNull().default("active"),
	metadata: jsonb("metadata").$type<{
		userAgent?: string;
		referrer?: string;
		pageUrl?: string;
		ip?: string;
	}>(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WidgetConversation = InferSelectModel<typeof widgetConversation>;

export const widgetMessageRoleEnum = pgEnum("widget_message_role", [
	"user",
	"assistant",
	"system",
	"agent",
]);

export const widgetMessage = pgTable("WidgetMessage", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	conversationId: uuid("conversation_id")
		.notNull()
		.references(() => widgetConversation.id),
	role: widgetMessageRoleEnum("role").notNull(),
	content: text("content").notNull(),
	playbookStepId: uuid("playbook_step_id"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WidgetMessage = InferSelectModel<typeof widgetMessage>;

// ===========================================
// PLAYBOOK/FLOW BUILDER SYSTEM
// ===========================================

export const playbookStatusEnum = pgEnum("playbook_status", [
	"draft",
	"active",
	"paused",
]);

export const playbookTriggerTypeEnum = pgEnum("playbook_trigger_type", [
	"keyword",
	"intent",
	"url",
	"manual",
	"first_message",
]);

export const playbook = pgTable("Playbook", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	botId: uuid("bot_id").references(() => bot.id),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	triggerType: playbookTriggerTypeEnum("trigger_type").notNull(),
	triggerConfig: jsonb("trigger_config").$type<{
		keywords?: string[];
		intents?: string[];
		urlPatterns?: string[];
	}>(),
	status: playbookStatusEnum("status").notNull().default("draft"),
	priority: integer("priority").notNull().default(0),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Playbook = InferSelectModel<typeof playbook>;

export const playbookStepTypeEnum = pgEnum("playbook_step_type", [
	"message",
	"question",
	"options",
	"condition",
	"action",
	"handoff",
	"stop",
]);

export const playbookStep = pgTable("PlaybookStep", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	playbookId: uuid("playbook_id")
		.notNull()
		.references(() => playbook.id),
	type: playbookStepTypeEnum("type").notNull(),
	name: varchar("name", { length: 255 }),
	config: jsonb("config").$type<{
		// For message step
		message?: string;
		// For question step
		question?: string;
		variableName?: string;
		validation?: "email" | "phone" | "text" | "number";
		// For options step
		options?: Array<{ label: string; value: string; nextStepId?: string }>;
		// For condition step
		conditions?: Array<{
			variable: string;
			operator: "equals" | "contains" | "startsWith" | "regex";
			value: string;
			nextStepId: string;
		}>;
		defaultNextStepId?: string;
		// For action step
		actionType?: "capture_contact" | "add_tag" | "set_score" | "webhook";
		actionConfig?: Record<string, unknown>;
		// For handoff step
		department?: string;
		priority?: number;
		aiSummaryEnabled?: boolean;
	}>(),
	position: integer("position").notNull().default(0),
	nextStepId: uuid("next_step_id"),
	// Visual position for the flow builder
	positionX: integer("position_x").default(0),
	positionY: integer("position_y").default(0),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PlaybookStep = InferSelectModel<typeof playbookStep>;

export const playbookExecutionStatusEnum = pgEnum("playbook_execution_status", [
	"active",
	"completed",
	"abandoned",
	"handed_off",
]);

export const playbookExecution = pgTable("PlaybookExecution", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	playbookId: uuid("playbook_id")
		.notNull()
		.references(() => playbook.id),
	conversationId: uuid("conversation_id")
		.notNull()
		.references(() => widgetConversation.id),
	currentStepId: uuid("current_step_id"),
	variables: jsonb("variables").$type<Record<string, unknown>>().default({}),
	status: playbookExecutionStatusEnum("status").notNull().default("active"),
	startedAt: timestamp("started_at").notNull().defaultNow(),
	completedAt: timestamp("completed_at"),
});

export type PlaybookExecution = InferSelectModel<typeof playbookExecution>;

// ===========================================
// LIVE CHAT HANDOFF SYSTEM
// ===========================================

export const agentStatusEnum = pgEnum("agent_status", [
	"online",
	"away",
	"busy",
	"offline",
]);

export const agent = pgTable("Agent", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	status: agentStatusEnum("status").notNull().default("offline"),
	maxConcurrentChats: integer("max_concurrent_chats").notNull().default(5),
	departments: jsonb("departments").$type<string[]>().default([]),
	currentChatCount: integer("current_chat_count").notNull().default(0),
	lastActiveAt: timestamp("last_active_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Agent = InferSelectModel<typeof agent>;

export const liveChatQueueStatusEnum = pgEnum("live_chat_queue_status", [
	"waiting",
	"assigned",
	"resolved",
]);

export const liveChatQueue = pgTable("LiveChatQueue", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	conversationId: uuid("conversation_id")
		.notNull()
		.references(() => widgetConversation.id),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	priority: integer("priority").notNull().default(0),
	assignedAgentId: uuid("assigned_agent_id").references(() => agent.id),
	status: liveChatQueueStatusEnum("status").notNull().default("waiting"),
	department: varchar("department", { length: 100 }),
	aiSummary: text("ai_summary"),
	waitingSince: timestamp("waiting_since").notNull().defaultNow(),
	assignedAt: timestamp("assigned_at"),
	resolvedAt: timestamp("resolved_at"),
});

export type LiveChatQueue = InferSelectModel<typeof liveChatQueue>;

// ===========================================
// SCHEDULED RETRAINING & TRAINING SUGGESTIONS
// ===========================================

export const retrainingScheduleEnum = pgEnum("retraining_schedule", [
	"daily",
	"weekly",
	"monthly",
]);

export const retrainingConfig = pgTable("RetrainingConfig", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id)
		.unique(),
	enabled: boolean("enabled").notNull().default(false),
	schedule: retrainingScheduleEnum("schedule").notNull().default("weekly"),
	lastRunAt: timestamp("last_run_at"),
	nextRunAt: timestamp("next_run_at"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type RetrainingConfig = InferSelectModel<typeof retrainingConfig>;

export const sitemapScan = pgTable("SitemapScan", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	sitemapUrl: varchar("sitemap_url", { length: 500 }).notNull(),
	pagesFound: integer("pages_found").notNull().default(0),
	newPages: integer("new_pages").notNull().default(0),
	removedPages: integer("removed_pages").notNull().default(0),
	scanResults: jsonb("scan_results").$type<{
		existingUrls: string[];
		newUrls: string[];
		removedUrls: string[];
	}>(),
	scannedAt: timestamp("scanned_at").notNull().defaultNow(),
});

export type SitemapScan = InferSelectModel<typeof sitemapScan>;

export const trainingSuggestionTypeEnum = pgEnum("training_suggestion_type", [
	"new_page",
	"removed_page",
	"updated_page",
]);

export const trainingSuggestionStatusEnum = pgEnum(
	"training_suggestion_status",
	["pending", "accepted", "dismissed"],
);

export const trainingSuggestion = pgTable("TrainingSuggestion", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),
	businessId: uuid("business_id")
		.notNull()
		.references(() => business.id),
	scanId: uuid("scan_id").references(() => sitemapScan.id),
	type: trainingSuggestionTypeEnum("type").notNull(),
	url: varchar("url", { length: 500 }).notNull(),
	title: varchar("title", { length: 500 }),
	status: trainingSuggestionStatusEnum("status").notNull().default("pending"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	processedAt: timestamp("processed_at"),
});

export type TrainingSuggestion = InferSelectModel<typeof trainingSuggestion>;
