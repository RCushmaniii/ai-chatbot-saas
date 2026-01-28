DO $$ BEGIN
 CREATE TYPE "public"."agent_status" AS ENUM('online', 'away', 'busy', 'offline');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'annual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."contact_activity_type" AS ENUM('page_view', 'chat_started', 'message_sent', 'email_captured', 'phone_captured', 'playbook_completed', 'handoff_requested', 'converted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."contact_status" AS ENUM('new', 'engaged', 'qualified', 'converted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_source_status" AS ENUM('pending', 'processing', 'processed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_source_type" AS ENUM('website', 'pdf', 'text', 'paste');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."live_chat_queue_status" AS ENUM('waiting', 'assigned', 'resolved');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."membership_role" AS ENUM('owner', 'admin', 'member');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."playbook_execution_status" AS ENUM('active', 'completed', 'abandoned', 'handed_off');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."playbook_status" AS ENUM('draft', 'active', 'paused');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."playbook_step_type" AS ENUM('message', 'question', 'options', 'condition', 'action', 'handoff', 'stop');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."playbook_trigger_type" AS ENUM('keyword', 'intent', 'url', 'manual', 'first_message');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."retraining_schedule" AS ENUM('daily', 'weekly', 'monthly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'canceled', 'past_due', 'incomplete');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."training_suggestion_status" AS ENUM('pending', 'accepted', 'dismissed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."training_suggestion_type" AS ENUM('new_page', 'removed_page', 'updated_page');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."widget_conversation_status" AS ENUM('active', 'closed', 'handed_off');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."widget_message_role" AS ENUM('user', 'assistant', 'system', 'agent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "agent_status" DEFAULT 'offline' NOT NULL,
	"max_concurrent_chats" integer DEFAULT 5 NOT NULL,
	"departments" jsonb DEFAULT '[]'::jsonb,
	"current_chat_count" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"name" varchar(255),
	"status" "contact_status" DEFAULT 'new' NOT NULL,
	"lead_score" integer DEFAULT 0,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"custom_fields" jsonb,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ContactActivity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"type" "contact_activity_type" NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ContentSource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"bot_id" uuid,
	"type" "content_source_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" varchar(500),
	"status" "content_source_status" DEFAULT 'pending' NOT NULL,
	"page_count" integer DEFAULT 0,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"bot_id" uuid,
	"source_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"token_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LiveChatQueue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"assigned_agent_id" uuid,
	"status" "live_chat_queue_status" DEFAULT 'waiting' NOT NULL,
	"department" varchar(100),
	"ai_summary" text,
	"waiting_since" timestamp DEFAULT now() NOT NULL,
	"assigned_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"description" text,
	"price_monthly" integer NOT NULL,
	"price_annual" integer NOT NULL,
	"stripe_price_id_monthly" varchar(100),
	"stripe_price_id_annual" varchar(100),
	"messages_per_month" integer NOT NULL,
	"knowledge_base_pages_limit" integer NOT NULL,
	"chatbots_limit" integer NOT NULL,
	"team_members_limit" integer NOT NULL,
	"features" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Playbook" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"bot_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_type" "playbook_trigger_type" NOT NULL,
	"trigger_config" jsonb,
	"status" "playbook_status" DEFAULT 'draft' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PlaybookExecution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playbook_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"current_step_id" uuid,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"status" "playbook_execution_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PlaybookStep" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playbook_id" uuid NOT NULL,
	"type" "playbook_step_type" NOT NULL,
	"name" varchar(255),
	"config" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"next_step_id" uuid,
	"position_x" integer DEFAULT 0,
	"position_y" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RetrainingConfig" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"schedule" "retraining_schedule" DEFAULT 'weekly' NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "RetrainingConfig_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SitemapScan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sitemap_url" varchar(500) NOT NULL,
	"pages_found" integer DEFAULT 0 NOT NULL,
	"new_pages" integer DEFAULT 0 NOT NULL,
	"removed_pages" integer DEFAULT 0 NOT NULL,
	"scan_results" jsonb,
	"scanned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"stripe_customer_id" varchar(100),
	"stripe_subscription_id" varchar(100),
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'monthly' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"trial_ends_at" timestamp,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TrainingSuggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"scan_id" uuid,
	"type" "training_suggestion_type" NOT NULL,
	"url" varchar(500) NOT NULL,
	"title" varchar(500),
	"status" "training_suggestion_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "UsageRecord" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"messages_count" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"knowledge_base_pages_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "WidgetConversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"bot_id" uuid,
	"visitor_id" varchar(100) NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"contact_id" uuid,
	"status" "widget_conversation_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "WidgetMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "widget_message_role" NOT NULL,
	"content" text NOT NULL,
	"playbook_step_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Membership" ALTER COLUMN "role" SET DATA TYPE membership_role;--> statement-breakpoint
ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "Membership" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Document_Knowledge" ADD COLUMN "business_id" uuid;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "clerk_user_id" varchar(100);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "name" varchar(100);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "avatar_url" varchar(500);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "locale" varchar(5) DEFAULT 'es';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Agent" ADD CONSTRAINT "Agent_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Agent" ADD CONSTRAINT "Agent_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Contact" ADD CONSTRAINT "Contact_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ContactActivity" ADD CONSTRAINT "ContactActivity_contact_id_Contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ContentSource" ADD CONSTRAINT "ContentSource_bot_id_Bot_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."Bot"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_bot_id_Bot_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."Bot"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_source_id_ContentSource_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ContentSource"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LiveChatQueue" ADD CONSTRAINT "LiveChatQueue_conversation_id_WidgetConversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."WidgetConversation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LiveChatQueue" ADD CONSTRAINT "LiveChatQueue_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LiveChatQueue" ADD CONSTRAINT "LiveChatQueue_assigned_agent_id_Agent_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."Agent"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_bot_id_Bot_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."Bot"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PlaybookExecution" ADD CONSTRAINT "PlaybookExecution_playbook_id_Playbook_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."Playbook"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PlaybookExecution" ADD CONSTRAINT "PlaybookExecution_conversation_id_WidgetConversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."WidgetConversation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PlaybookStep" ADD CONSTRAINT "PlaybookStep_playbook_id_Playbook_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."Playbook"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RetrainingConfig" ADD CONSTRAINT "RetrainingConfig_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SitemapScan" ADD CONSTRAINT "SitemapScan_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_id_Plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."Plan"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TrainingSuggestion" ADD CONSTRAINT "TrainingSuggestion_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TrainingSuggestion" ADD CONSTRAINT "TrainingSuggestion_scan_id_SitemapScan_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."SitemapScan"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WidgetConversation" ADD CONSTRAINT "WidgetConversation_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WidgetConversation" ADD CONSTRAINT "WidgetConversation_bot_id_Bot_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."Bot"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WidgetConversation" ADD CONSTRAINT "WidgetConversation_contact_id_Contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."Contact"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WidgetMessage" ADD CONSTRAINT "WidgetMessage_conversation_id_WidgetConversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."WidgetConversation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document_Knowledge" ADD CONSTRAINT "Document_Knowledge_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_clerk_user_id_unique" UNIQUE("clerk_user_id");