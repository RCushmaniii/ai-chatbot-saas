ALTER TABLE "Business" ADD COLUMN "onboarding_status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "Business" ADD COLUMN "onboarding_step" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";