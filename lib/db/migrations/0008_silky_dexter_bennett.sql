CREATE TABLE IF NOT EXISTS "Document_Knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"url" varchar(500),
	"embedding" vector(1536),
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
