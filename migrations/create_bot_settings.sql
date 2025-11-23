-- Create bot_settings table for storing customization options
CREATE TABLE IF NOT EXISTS bot_settings (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "botName" VARCHAR(100),
  "customInstructions" TEXT,
  "starterQuestions" JSONB,
  colors JSONB,
  settings JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on userId for faster lookups
CREATE INDEX IF NOT EXISTS idx_bot_settings_user_id ON bot_settings("userId");

-- Add unique constraint to ensure one settings record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_settings_user_unique ON bot_settings("userId");
