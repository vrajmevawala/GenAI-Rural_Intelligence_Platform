-- Unified schema migration for KhedutMitra
-- This file replaces legacy split migrations 001..008.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 1. CORE TABLES
-- =========================
CREATE TABLE IF NOT EXISTS farmers (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password TEXT,
  language VARCHAR(20),
  district VARCHAR(50),
  village VARCHAR(50),
  latitude DECIMAL,
  longitude DECIMAL,
  soil_type VARCHAR(20),
  land_size DECIMAL,
  annual_income DECIMAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  water_requirement VARCHAR(20),
  heat_tolerance VARCHAR(20),
  risk_level VARCHAR(20),
  ideal_soil VARCHAR(20),
  season VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmer_crops (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),
  area_allocated DECIMAL,
  season VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fvi_records (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),
  score INTEGER,
  risk_level VARCHAR(20),
  crop_risk INTEGER,
  soil_crop_risk INTEGER,
  weather_risk INTEGER,
  disease_risk INTEGER,
  breakdown JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vulnerability_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  score NUMERIC,
  risk_label VARCHAR(20),
  score_breakdown JSONB DEFAULT '{}',
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY,
  location VARCHAR(50),
  district VARCHAR(50),
  state VARCHAR(50),
  temperature DECIMAL,
  rainfall DECIMAL,
  humidity DECIMAL,
  fetched_at TIMESTAMP,
  valid_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),
  message TEXT,
  reason TEXT,
  risk_level VARCHAR(20),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disease_records (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),
  disease_name VARCHAR(100),
  severity VARCHAR(20),
  status VARCHAR(20),
  confidence DECIMAL,
  image_url TEXT,
  detected_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schemes (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  eligibility_criteria TEXT,
  benefit TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmer_schemes (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  scheme_id UUID REFERENCES schemes(id),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  type VARCHAR(50),
  location VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institution_users (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions(id),
  name VARCHAR(100),
  email VARCHAR(100),
  password TEXT,
  role VARCHAR(50),
  preferred_language VARCHAR(20) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  message TEXT,
  response TEXT,
  channel VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS voice_logs (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  input_text TEXT,
  output_text TEXT,
  audio_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS image_analysis (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),
  image_url TEXT,
  detected_issue TEXT,
  confidence DECIMAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  type VARCHAR(50),
  content TEXT,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY,
  district VARCHAR(50),
  state VARCHAR(50),
  latitude DECIMAL,
  longitude DECIMAL
);

-- =========================
-- 2. FARMERS ENHANCEMENTS
-- =========================
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS farmer_code INTEGER;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS taluka VARCHAR(80);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS primary_crop VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS secondary_crop VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS irrigation_type VARCHAR(60);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS family_size INTEGER;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS loan_amount_inr NUMERIC;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS loan_type VARCHAR(60);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS loan_due_date DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS last_repayment_date DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS has_crop_insurance BOOLEAN DEFAULT false;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS pm_kisan_enrolled BOOLEAN DEFAULT false;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS pm_kisan_last_installment_date DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS sowing_date DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) DEFAULT 'gu';
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS institution_id UUID;

CREATE SEQUENCE IF NOT EXISTS farmers_farmer_code_seq START WITH 1001;

UPDATE farmers
SET farmer_code = nextval('farmers_farmer_code_seq')
WHERE farmer_code IS NULL;

ALTER TABLE farmers
ALTER COLUMN farmer_code SET DEFAULT nextval('farmers_farmer_code_seq');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'farmers_farmer_code_unique'
  ) THEN
    ALTER TABLE farmers
    ADD CONSTRAINT farmers_farmer_code_unique UNIQUE (farmer_code);
  END IF;
END $$;

-- =========================
-- 3. ALERTS ENHANCEMENTS
-- =========================
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_type VARCHAR(30);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'gu';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS voice_note_script TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT TRUE;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 100;

UPDATE alerts
SET message_text = message
WHERE message_text IS NULL AND message IS NOT NULL;

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

ALTER TABLE alerts ALTER COLUMN alert_type SET NOT NULL;
ALTER TABLE alerts ALTER COLUMN alert_type SET DEFAULT 'custom';

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN (
    'score_change', 'loan_overdue', 'insurance_expiry',
    'pm_kisan_pending', 'weather_risk', 'scheme_opportunity',
    'officer_callback', 'custom',
    'crop_disease_risk', 'weather_extreme', 'soil_health',
    'pest_outbreak', 'harvest_advisory', 'market_price',
    'vulnerability_spike', 'irrigation_advisory',
    'fertilizer_advisory', 'sowing_advisory'
  ));

CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_type_status ON alerts(alert_type, status);
CREATE INDEX IF NOT EXISTS idx_alerts_validation_score ON alerts(validation_score);
CREATE INDEX IF NOT EXISTS idx_vulnerability_score_history_farmer_calc
  ON vulnerability_score_history(farmer_id, calculated_at DESC);

-- =========================
-- 4. WEATHER ENHANCEMENTS
-- =========================
ALTER TABLE weather_cache
ADD COLUMN IF NOT EXISTS forecast_json JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN weather_cache.forecast_json IS
'Daily forecast data from Open-Meteo API: temperature_2m_max, temperature_2m_min, relative_humidity_2m_max, precipitation_sum, windspeed_10m_max';

-- =========================
-- 5. WHATSAPP TABLES
-- =========================
DO $$ BEGIN
  CREATE TYPE bot_stage AS ENUM (
    'welcome', 'alerts_summary', 'menu',
    'insurance_flow', 'pmkisan_flow',
    'weather_flow', 'scheme_flow',
    'profile_view', 'officer_connect', 'financial_flow',
    'language_switch', 'done'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bot_language AS ENUM ('gu', 'hi', 'en', 'hinglish');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
  organization_id UUID,
  phone_number VARCHAR(20) NOT NULL,
  language bot_language NOT NULL DEFAULT 'gu',
  current_stage bot_stage NOT NULL DEFAULT 'welcome',
  context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  session_expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  twilio_sid VARCHAR(64),
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_farmer ON whatsapp_conversations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_active ON whatsapp_conversations(is_active, session_expires_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msgs_conv ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msgs_created ON whatsapp_messages(created_at);

COMMIT;
