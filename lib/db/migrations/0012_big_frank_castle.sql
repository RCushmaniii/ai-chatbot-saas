DO $$ BEGIN
 CREATE TYPE "public"."conversation_channel" AS ENUM('web', 'whatsapp', 'slack', 'teams');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "WhatsappPhoneMapping" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"phone_number_id" varchar(50) NOT NULL,
	"display_phone_number" varchar(20) NOT NULL,
	"display_name" varchar(255),
	"access_token" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "WhatsappPhoneMapping_phone_number_id_unique" UNIQUE("phone_number_id")
);
--> statement-breakpoint
ALTER TABLE "WidgetConversation" ALTER COLUMN "visitor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "WidgetConversation" ALTER COLUMN "session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "WidgetConversation" ADD COLUMN "channel" "conversation_channel" DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "WidgetConversation" ADD COLUMN "phone_number" varchar(20);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WhatsappPhoneMapping" ADD CONSTRAINT "WhatsappPhoneMapping_business_id_Business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."Business"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
