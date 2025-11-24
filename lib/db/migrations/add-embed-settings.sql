-- Add embedSettings column to bot_settings table
ALTER TABLE bot_settings 
ADD COLUMN IF NOT EXISTS "embedSettings" jsonb;

-- Add a comment to describe the column
COMMENT ON COLUMN bot_settings."embedSettings" IS 'Configuration for the embed widget including button color, position, suggested questions, etc.';
