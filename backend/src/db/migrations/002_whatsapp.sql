-- WhatsApp bot conversation and messaging tables

DO $$ BEGIN
  CREATE TYPE bot_stage AS ENUM (
    'welcome', 'alerts_summary', 'menu',
    'insurance_flow', 'pmkisan_flow', 
    'weather_flow', 'scheme_flow',
    'officer_connect', 'language_switch', 'done'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bot_language AS ENUM ('gu', 'hi', 'en', 'hinglish');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_conversations CASCADE;

CREATE TABLE whatsapp_conversations (
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

CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  twilio_sid VARCHAR(64),
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_conv_phone ON whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_conv_farmer ON whatsapp_conversations(farmer_id);
CREATE INDEX idx_whatsapp_conv_active ON whatsapp_conversations(is_active, session_expires_at);
CREATE INDEX idx_whatsapp_msgs_conv ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_msgs_created ON whatsapp_messages(created_at);
