-- Migration 006: Add validation_score column to alerts table
-- Purpose: Track alert quality score from AI validation (0-100)
-- Default: 100 (assuming high quality if not specified)

DO $$ BEGIN
    ALTER TABLE alerts ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 100;
EXCEPTION WHEN others THEN
    -- Column already exists, skip
    NULL;
END $$;

-- Create index on validation_score for officer dashboard filtering
DO $$ BEGIN
    CREATE INDEX idx_alerts_validation_score ON alerts(validation_score);
EXCEPTION WHEN others THEN
    -- Index already exists, skip
    NULL;
END $$;
