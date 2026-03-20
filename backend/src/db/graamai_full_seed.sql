-- GraamAI FULL Seed Data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TRUNCATE ALL TABLES TO START FRESH
TRUNCATE TABLE image_analysis CASCADE;
TRUNCATE TABLE voice_logs CASCADE;
TRUNCATE TABLE chat_logs CASCADE;
TRUNCATE TABLE institution_users CASCADE;
TRUNCATE TABLE institutions CASCADE;
TRUNCATE TABLE farmer_schemes CASCADE;
TRUNCATE TABLE schemes CASCADE;
TRUNCATE TABLE alerts CASCADE;
TRUNCATE TABLE fvi_records CASCADE;
TRUNCATE TABLE farmer_crops CASCADE;
TRUNCATE TABLE crops CASCADE;
TRUNCATE TABLE farmers CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE weather_cache CASCADE;
TRUNCATE TABLE notifications CASCADE;

-- CROPS
INSERT INTO crops (id, name, water_requirement, heat_tolerance, risk_level, ideal_soil, season)
VALUES
(uuid_generate_v4(), 'Rice', 'high', 'low', 'high', 'clay', 'kharif'),
(uuid_generate_v4(), 'Wheat', 'low', 'medium', 'low', 'loamy', 'rabi'),
(uuid_generate_v4(), 'Cotton', 'medium', 'medium', 'medium', 'black', 'kharif'),
(uuid_generate_v4(), 'Groundnut', 'medium', 'high', 'medium', 'sandy', 'kharif'),
(uuid_generate_v4(), 'Bajra', 'low', 'high', 'low', 'sandy', 'kharif'),
(uuid_generate_v4(), 'Maize', 'medium', 'medium', 'medium', 'loamy', 'kharif'),
(uuid_generate_v4(), 'Sugarcane', 'high', 'low', 'high', 'loamy', 'all');

-- FARMERS
INSERT INTO farmers (id, name, phone, language, district, village, soil_type, land_size, annual_income)
VALUES
(uuid_generate_v4(), 'Ramesh Patel', '9999990001', 'gujarati', 'Anand', 'Karamsad', 'sandy', 2.5, 150000),
(uuid_generate_v4(), 'Suresh Kumar', '9999990002', 'hindi', 'Ahmedabad', 'Sanand', 'loamy', 3.0, 200000),
(uuid_generate_v4(), 'Maheshbhai', '9999990003', 'gujarati', 'Vadodara', 'Padra', 'clay', 1.8, 120000);

-- FARMER CROPS
INSERT INTO farmer_crops (id, farmer_id, crop_id, area_allocated, season)
SELECT uuid_generate_v4(), f.id, c.id, 2.0, 'kharif'
FROM farmers f, crops c
WHERE f.name = 'Ramesh Patel' AND c.name = 'Rice';

INSERT INTO farmer_crops (id, farmer_id, crop_id, area_allocated, season)
SELECT uuid_generate_v4(), f.id, c.id, 3.0, 'rabi'
FROM farmers f, crops c
WHERE f.name = 'Suresh Kumar' AND c.name = 'Wheat';

INSERT INTO farmer_crops (id, farmer_id, crop_id, area_allocated, season)
SELECT uuid_generate_v4(), f.id, c.id, 1.5, 'kharif'
FROM farmers f, crops c
WHERE f.name = 'Maheshbhai' AND c.name = 'Cotton';

-- FVI RECORDS
INSERT INTO fvi_records (id, farmer_id, score, breakdown)
SELECT uuid_generate_v4(), id, 45, '{"water": 10, "soil": 15, "weather": 5, "pest": 10, "market": 5}' FROM farmers;

-- ALERTS
INSERT INTO alerts (id, farmer_id, crop_id, message, reason, risk_level, status)
SELECT 
  uuid_generate_v4(),
  f.id,
  c.id,
  'Turant irrigation karo ane rog ni dava karo',
  'High temperature + no rainfall + disease detected',
  'CRITICAL',
  'pending'
FROM farmers f, crops c
WHERE f.name = 'Ramesh Patel' AND c.name = 'Rice';

-- SCHEMES
INSERT INTO schemes (id, name, description, eligibility_criteria, benefit)
VALUES
(uuid_generate_v4(), 'PM-KISAN', 'Income support for farmers', 'Small and marginal farmers', '6000 per year'),
(uuid_generate_v4(), 'PMFBY', 'Crop insurance scheme', 'All farmers', 'Insurance coverage'),
(uuid_generate_v4(), 'Soil Health Card', 'Soil testing support', 'All farmers', 'Free soil analysis');

-- FARMER SCHEMES
INSERT INTO farmer_schemes (id, farmer_id, scheme_id, status)
SELECT 
  uuid_generate_v4(),
  f.id,
  s.id,
  'eligible'
FROM farmers f, schemes s
WHERE f.name = 'Ramesh Patel' AND s.name = 'PM-KISAN';

-- INSTITUTIONS
INSERT INTO institutions (id, name, type, location)
VALUES
(uuid_generate_v4(), 'Anand Cooperative Bank', 'bank', 'Anand'),
(uuid_generate_v4(), 'Agri NGO Gujarat', 'ngo', 'Ahmedabad');

-- INSTITUTION USERS (Password: Admin@1234)
INSERT INTO institution_users (id, institution_id, name, email, password, role)
SELECT 
  uuid_generate_v4(),
  i.id,
  'Admin User',
  'admin@graamai.com',
  'Admin@1234',
  'superadmin'
FROM institutions i
WHERE i.name = 'Anand Cooperative Bank'
LIMIT 1;

-- CHAT LOGS
INSERT INTO chat_logs (id, farmer_id, message, response, channel)
SELECT 
  uuid_generate_v4(),
  f.id,
  'Maro risk shu che?',
  'Tamaro FVI 80 che (HIGH)',
  'whatsapp'
FROM farmers f
WHERE f.name = 'Ramesh Patel';

-- VOICE LOGS
INSERT INTO voice_logs (id, farmer_id, input_text, output_text, audio_url)
SELECT 
  uuid_generate_v4(),
  f.id,
  'Mane salah joiye',
  'Turant irrigation karo',
  'https://example.com/audio.mp3'
FROM farmers f
WHERE f.name = 'Ramesh Patel';

-- NOTIFICATIONS
INSERT INTO notifications (id, farmer_id, type, content, status)
SELECT 
  uuid_generate_v4(),
  f.id,
  'alert',
  'High risk detected',
  'sent'
FROM farmers f
WHERE f.name = 'Ramesh Patel';

-- LOCATIONS
INSERT INTO locations (id, district, state, latitude, longitude)
VALUES
(uuid_generate_v4(), 'Anand', 'Gujarat', 22.5645, 72.9289),
(uuid_generate_v4(), 'Ahmedabad', 'Gujarat', 23.0225, 72.5714),
(uuid_generate_v4(), 'Vadodara', 'Gujarat', 22.3072, 73.1812);
