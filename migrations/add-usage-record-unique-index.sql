-- Add unique constraint on (business_id, month) for UsageRecord upserts
-- This enables ON CONFLICT for the incrementMessageCount function
CREATE UNIQUE INDEX IF NOT EXISTS "UsageRecord_business_month_unique"
ON "UsageRecord" (business_id, month);
