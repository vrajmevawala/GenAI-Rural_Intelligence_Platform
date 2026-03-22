-- Add sowing_date column to farmers table for crop-specific alert generation

DO $$ BEGIN
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS sowing_date DATE;
EXCEPTION WHEN others THEN
    -- Column already exists or other error, continue
    NULL;
END $$;

-- Add secondary_crop column if not present (for multi-crop tracking)
DO $$ BEGIN
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS secondary_crop VARCHAR(100);
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- Add preferred_language column if not present (for multi-language alerts)
DO $$ BEGIN
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) DEFAULT 'gu';
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- Add taluka column if not present (for location specificity)
DO $$ BEGIN
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS taluka VARCHAR(50);
EXCEPTION WHEN others THEN
    NULL;
END $$;
