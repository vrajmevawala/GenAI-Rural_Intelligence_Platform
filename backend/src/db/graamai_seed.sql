-- GraamAI Seed Data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- DISEASE
INSERT INTO disease_records (id, farmer_id, crop_id, disease_name, severity, status, confidence, image_url, detected_at, updated_at)
SELECT 
  uuid_generate_v4(),
  f.id,
  c.id,
  'Leaf Blight',
  'high',
  'active',
  0.92,
  'https://example.com/image1.jpg',
  NOW(),
  NOW()
FROM farmers f, crops c
WHERE f.name = 'Ramesh Patel' AND c.name = 'Rice';

-- ALERTS
INSERT INTO alerts (id, farmer_id, crop_id, message, reason, risk_level)
SELECT 
  uuid_generate_v4(),
  f.id,
  c.id,
  'Turant irrigation karo ane rog ni dava karo',
  'High temperature + no rainfall + disease detected',
  'CRITICAL'
FROM farmers f, crops c
WHERE f.name = 'Ramesh Patel' AND c.name = 'Rice';
