-- =========================
-- 1. FARMERS
-- =========================
CREATE TABLE farmers (
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

-- =========================
-- 2. CROPS
-- =========================
CREATE TABLE crops (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,

  water_requirement VARCHAR(20),
  heat_tolerance VARCHAR(20),
  risk_level VARCHAR(20),

  ideal_soil VARCHAR(20),
  season VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 3. FARMER_CROPS
-- =========================
CREATE TABLE farmer_crops (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),

  area_allocated DECIMAL,
  season VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 4. FVI RECORDS
-- =========================
CREATE TABLE fvi_records (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),

  score INTEGER,
  risk_level VARCHAR(20),

  crop_risk INTEGER,
  soil_crop_risk INTEGER,
  weather_risk INTEGER,
  disease_risk INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 5. WEATHER CACHE (OPTIONAL)
-- =========================
CREATE TABLE weather_cache (
  id UUID PRIMARY KEY,
  location VARCHAR(50),

  temperature DECIMAL,
  rainfall DECIMAL,
  humidity DECIMAL,

  fetched_at TIMESTAMP
);

-- =========================
-- 6. ALERTS
-- =========================
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),

  message TEXT,
  reason TEXT,
  risk_level VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 7. DISEASE RECORDS
-- =========================
CREATE TABLE disease_records (
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

-- =========================
-- 8. SCHEMES
-- =========================
CREATE TABLE schemes (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  eligibility_criteria TEXT,
  benefit TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 9. FARMER_SCHEMES
-- =========================
CREATE TABLE farmer_schemes (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  scheme_id UUID REFERENCES schemes(id),

  status VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 10. INSTITUTIONS
-- =========================
CREATE TABLE institutions (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  type VARCHAR(50),
  location VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 11. INSTITUTION_USERS
-- =========================
CREATE TABLE institution_users (
  id UUID PRIMARY KEY,
  institution_id UUID REFERENCES institutions(id),

  name VARCHAR(100),
  email VARCHAR(100),
  password TEXT,
  role VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 12. CHAT LOGS
-- =========================
CREATE TABLE chat_logs (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),

  message TEXT,
  response TEXT,
  channel VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 13. VOICE LOGS
-- =========================
CREATE TABLE voice_logs (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),

  input_text TEXT,
  output_text TEXT,
  audio_url TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 14. IMAGE ANALYSIS
-- =========================
CREATE TABLE image_analysis (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),
  crop_id UUID REFERENCES crops(id),

  image_url TEXT,
  detected_issue TEXT,
  confidence DECIMAL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 15. NOTIFICATIONS
-- =========================
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(id),

  type VARCHAR(50),
  content TEXT,
  status VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 16. LOCATIONS
-- =========================
CREATE TABLE locations (
  id UUID PRIMARY KEY,

  district VARCHAR(50),
  state VARCHAR(50),

  latitude DECIMAL,
  longitude DECIMAL
);
