CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE organization_type AS ENUM ('bank', 'nbfc', 'ngo');
CREATE TYPE subscription_tier AS ENUM ('basic', 'pro', 'enterprise');
CREATE TYPE user_role AS ENUM ('superadmin', 'org_admin', 'field_officer');
CREATE TYPE language_code AS ENUM ('en', 'hi', 'gu');
CREATE TYPE soil_type_enum AS ENUM ('sandy', 'clay', 'loam', 'black_cotton');
CREATE TYPE irrigation_type_enum AS ENUM ('rainfed', 'canal', 'borewell', 'drip');
CREATE TYPE loan_type_enum AS ENUM ('kcc', 'term_loan', 'none');
CREATE TYPE vulnerability_label_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE score_triggered_by_enum AS ENUM ('manual', 'scheduled', 'on_create');
CREATE TYPE drought_risk_level_enum AS ENUM ('none', 'low', 'moderate', 'high', 'severe');
CREATE TYPE benefit_type_enum AS ENUM ('cash', 'insurance', 'credit', 'subsidy');
CREATE TYPE application_status_enum AS ENUM ('not_started', 'in_progress', 'submitted', 'approved', 'rejected');
CREATE TYPE alert_type_enum AS ENUM ('insurance_expiry', 'loan_overdue', 'weather_risk', 'scheme_opportunity', 'pm_kisan_pending', 'custom');
CREATE TYPE alert_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE alert_status_enum AS ENUM ('pending', 'sent', 'failed', 'dismissed');

CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type organization_type NOT NULL,
  district VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  subscription_tier subscription_tier NOT NULL DEFAULT 'basic',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  farmers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  preferred_language language_code NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE farmers (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  aadhaar_last4 CHAR(4) NOT NULL,
  district VARCHAR(100) NOT NULL,
  taluka VARCHAR(100) NOT NULL,
  village VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  land_area_acres NUMERIC(10, 2) NOT NULL CHECK (land_area_acres > 0),
  primary_crop VARCHAR(100) NOT NULL,
  secondary_crop VARCHAR(100),
  soil_type soil_type_enum NOT NULL,
  irrigation_type irrigation_type_enum NOT NULL,
  annual_income_inr INTEGER NOT NULL CHECK (annual_income_inr >= 0),
  family_size INTEGER NOT NULL CHECK (family_size > 0),
  loan_amount_inr INTEGER CHECK (loan_amount_inr >= 0),
  loan_type loan_type_enum NOT NULL DEFAULT 'none',
  loan_due_date DATE,
  last_repayment_date DATE,
  has_crop_insurance BOOLEAN NOT NULL DEFAULT FALSE,
  insurance_expiry_date DATE,
  pm_kisan_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
  pm_kisan_last_installment_date DATE,
  bank_account_number VARCHAR(50),
  preferred_language language_code NOT NULL DEFAULT 'en',
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  vulnerability_score INTEGER NOT NULL DEFAULT 0 CHECK (vulnerability_score BETWEEN 0 AND 100),
  vulnerability_label vulnerability_label_enum NOT NULL DEFAULT 'low',
  score_last_calculated_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, phone),
  CHECK (aadhaar_last4 ~ '^[0-9]{4}$')
);

CREATE TABLE vulnerability_score_history (
  id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  label vulnerability_label_enum NOT NULL,
  score_breakdown JSONB NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_by score_triggered_by_enum NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE weather_cache (
  id UUID PRIMARY KEY,
  district VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  forecast_json JSONB NOT NULL,
  drought_risk_level drought_risk_level_enum NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (district, state)
);

CREATE TABLE government_schemes (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  eligibility_rules JSONB NOT NULL,
  benefit_amount_inr INTEGER,
  benefit_type benefit_type_enum NOT NULL,
  application_url VARCHAR(500) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE farmer_scheme_matches (
  id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  scheme_id UUID NOT NULL REFERENCES government_schemes(id),
  is_eligible BOOLEAN NOT NULL,
  eligibility_score INTEGER NOT NULL CHECK (eligibility_score BETWEEN 0 AND 100),
  missing_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_explanation TEXT NOT NULL,
  application_status application_status_enum NOT NULL DEFAULT 'not_started',
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (farmer_id, scheme_id)
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  alert_type alert_type_enum NOT NULL,
  priority alert_priority_enum NOT NULL,
  language language_code NOT NULL,
  message_text TEXT NOT NULL,
  voice_note_script TEXT NOT NULL,
  status alert_status_enum NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_organization_id ON users (organization_id);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
CREATE INDEX idx_farmers_organization_id ON farmers (organization_id);
CREATE INDEX idx_farmers_district ON farmers (district);
CREATE INDEX idx_farmers_vulnerability_label ON farmers (vulnerability_label);
CREATE INDEX idx_farmers_loan_due_date ON farmers (loan_due_date);
CREATE INDEX idx_farmers_insurance_expiry_date ON farmers (insurance_expiry_date);
CREATE INDEX idx_farmers_name_trgm ON farmers USING GIN (name gin_trgm_ops);
CREATE INDEX idx_vulnerability_history_farmer_id ON vulnerability_score_history (farmer_id);
CREATE INDEX idx_vulnerability_history_calculated_at ON vulnerability_score_history (calculated_at DESC);
CREATE INDEX idx_weather_cache_district_state ON weather_cache (district, state);
CREATE INDEX idx_weather_cache_valid_until ON weather_cache (valid_until);
CREATE INDEX idx_scheme_matches_farmer_id ON farmer_scheme_matches (farmer_id);
CREATE INDEX idx_scheme_matches_scheme_id ON farmer_scheme_matches (scheme_id);
CREATE INDEX idx_scheme_matches_status ON farmer_scheme_matches (application_status);
CREATE INDEX idx_alerts_organization_id ON alerts (organization_id);
CREATE INDEX idx_alerts_farmer_id ON alerts (farmer_id);
CREATE INDEX idx_alerts_status_priority ON alerts (status, priority);
CREATE INDEX idx_alerts_type ON alerts (alert_type);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_refresh_tokens_updated_at
BEFORE UPDATE ON refresh_tokens
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_farmers_updated_at
BEFORE UPDATE ON farmers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vulnerability_score_history_updated_at
BEFORE UPDATE ON vulnerability_score_history
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_weather_cache_updated_at
BEFORE UPDATE ON weather_cache
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_government_schemes_updated_at
BEFORE UPDATE ON government_schemes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_farmer_scheme_matches_updated_at
BEFORE UPDATE ON farmer_scheme_matches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_alerts_updated_at
BEFORE UPDATE ON alerts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_audit_logs_updated_at
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION update_organization_farmers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organizations
    SET farmers_count = farmers_count + 1,
        updated_at = NOW()
    WHERE id = NEW.organization_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organizations
    SET farmers_count = GREATEST(farmers_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.organization_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_farmers_count_after_insert
AFTER INSERT ON farmers
FOR EACH ROW EXECUTE FUNCTION update_organization_farmers_count();

CREATE TRIGGER trg_farmers_count_after_delete
AFTER DELETE ON farmers
FOR EACH ROW EXECUTE FUNCTION update_organization_farmers_count();
