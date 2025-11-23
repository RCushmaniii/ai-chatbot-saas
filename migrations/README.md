# Database Migrations

## Running Migrations

Execute these SQL files in your Vercel Postgres SQL Editor in order:

1. **create_bot_settings.sql** - Creates the `bot_settings` table for storing chatbot customization options

## Manual Migration Steps

1. Go to your Vercel Dashboard
2. Navigate to your project → Storage → Postgres
3. Click "Query" or "SQL Editor"
4. Copy and paste the contents of each `.sql` file
5. Execute the query

## What Each Migration Does

### create_bot_settings.sql

Creates a table to store:

- Bot name and custom instructions
- Starter questions (with emojis)
- Color customization
- UI settings (timestamps, citations, etc.)

Each user gets one settings record (enforced by unique constraint).
