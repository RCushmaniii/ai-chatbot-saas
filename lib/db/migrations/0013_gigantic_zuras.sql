CREATE TABLE IF NOT EXISTS "RateLimit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_key_ts_idx" ON "RateLimit" USING btree ("key","ts");