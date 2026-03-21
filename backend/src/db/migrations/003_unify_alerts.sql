-- 003_unify_alerts.sql

-- Add alert_type column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='alert_type'
  ) THEN
    ALTER TABLE alerts ADD COLUMN alert_type VARCHAR(30);
  END IF;
END $$;

-- Add reason column for human-readable explanation
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='reason'
  ) THEN
    ALTER TABLE alerts ADD COLUMN reason TEXT;
  END IF;
END $$;

-- Backfill and compatibility columns used by unified generator
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='organization_id'
  ) THEN
    ALTER TABLE alerts ADD COLUMN organization_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='priority'
  ) THEN
    ALTER TABLE alerts ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='language'
  ) THEN
    ALTER TABLE alerts ADD COLUMN language VARCHAR(20) DEFAULT 'gu';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='message_text'
  ) THEN
    ALTER TABLE alerts ADD COLUMN message_text TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='voice_note_script'
  ) THEN
    ALTER TABLE alerts ADD COLUMN voice_note_script TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='ai_generated'
  ) THEN
    ALTER TABLE alerts ADD COLUMN ai_generated BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='updated_at'
  ) THEN
    ALTER TABLE alerts ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='alerts' AND column_name='sent_at'
  ) THEN
    ALTER TABLE alerts ADD COLUMN sent_at TIMESTAMP;
  END IF;
END $$;

UPDATE alerts
SET message_text = message
WHERE message_text IS NULL AND message IS NOT NULL;

-- Migrate existing reason-based rows to alert_type
UPDATE alerts SET alert_type = 'score_change'
  WHERE alert_type IS NULL AND reason ILIKE '%score%';
UPDATE alerts SET alert_type = 'loan_overdue'
  WHERE alert_type IS NULL AND reason ILIKE '%loan%overdue%';
UPDATE alerts SET alert_type = 'insurance_expiry'
  WHERE alert_type IS NULL AND reason ILIKE '%insurance%';
UPDATE alerts SET alert_type = 'officer_callback'
  WHERE alert_type IS NULL AND reason ILIKE '%officer%callback%';
UPDATE alerts SET alert_type = 'custom'
  WHERE alert_type IS NULL;

-- Make alert_type NOT NULL going forward
ALTER TABLE alerts ALTER COLUMN alert_type SET NOT NULL;
ALTER TABLE alerts ALTER COLUMN alert_type SET DEFAULT 'custom';

-- Add constraint
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN (
    'score_change', 'loan_overdue', 'insurance_expiry',
    'pm_kisan_pending', 'weather_risk', 'scheme_opportunity',
    'officer_callback', 'custom'
  ));

-- Index for fast filtering on dashboard
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_type_status ON alerts(alert_type, status);
