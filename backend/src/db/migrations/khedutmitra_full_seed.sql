-- KhedutMitra clean seed
-- This file is idempotent when used with schema reset in setup.js.

BEGIN;

-- Clear data (order managed by CASCADE)
TRUNCATE TABLE whatsapp_messages CASCADE;
TRUNCATE TABLE whatsapp_conversations CASCADE;
TRUNCATE TABLE image_analysis CASCADE;
TRUNCATE TABLE voice_logs CASCADE;
TRUNCATE TABLE chat_logs CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE farmer_schemes CASCADE;
TRUNCATE TABLE schemes CASCADE;
TRUNCATE TABLE disease_records CASCADE;
TRUNCATE TABLE alerts CASCADE;
TRUNCATE TABLE fvi_records CASCADE;
TRUNCATE TABLE farmer_crops CASCADE;
TRUNCATE TABLE weather_cache CASCADE;
TRUNCATE TABLE institution_users CASCADE;
TRUNCATE TABLE institutions CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE farmers CASCADE;
TRUNCATE TABLE crops CASCADE;

-- Master data
INSERT INTO locations (id, district, state, latitude, longitude) VALUES
('10000000-0000-0000-0000-000000000001', 'Anand', 'Gujarat', 22.5645, 72.9289),
('10000000-0000-0000-0000-000000000002', 'Ahmedabad', 'Gujarat', 23.0225, 72.5714),
('10000000-0000-0000-0000-000000000003', 'Vadodara', 'Gujarat', 22.3072, 73.1812),
('10000000-0000-0000-0000-000000000004', 'Rajkot', 'Gujarat', 22.3039, 70.8022);

INSERT INTO institutions (id, name, type, location) VALUES
('20000000-0000-0000-0000-000000000001', 'Anand Cooperative Bank', 'bank', 'Anand'),
('20000000-0000-0000-0000-000000000002', 'Gujarat Krishi Seva Kendra', 'ngo', 'Ahmedabad');

-- Keep admin email compatible with existing login usage
INSERT INTO institution_users (id, institution_id, name, email, password, role, preferred_language) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Platform Admin', 'admin@graamai.com', 'Admin@1234', 'superadmin', 'en'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Field Officer Anand', 'officer.anand@khedutmitra.in', 'Officer@123', 'field_officer', 'gu'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'NGO Coordinator', 'coordinator@khedutmitra.in', 'Coord@123', 'org_admin', 'gu');

INSERT INTO crops (id, name, water_requirement, heat_tolerance, risk_level, ideal_soil, season) VALUES
('40000000-0000-0000-0000-000000000001', 'Wheat', 'medium', 'medium', 'medium', 'loam', 'rabi'),
('40000000-0000-0000-0000-000000000002', 'Cotton', 'medium', 'high', 'high', 'black_cotton', 'kharif'),
('40000000-0000-0000-0000-000000000003', 'Groundnut', 'low', 'high', 'medium', 'sandy', 'kharif'),
('40000000-0000-0000-0000-000000000004', 'Bajra', 'low', 'high', 'low', 'sandy', 'kharif'),
('40000000-0000-0000-0000-000000000005', 'Maize', 'medium', 'medium', 'medium', 'loam', 'kharif'),
('40000000-0000-0000-0000-000000000006', 'Castor', 'low', 'high', 'medium', 'black_cotton', 'kharif');

INSERT INTO farmers (id, name, phone, password, language, district, village, latitude, longitude, soil_type, land_size, annual_income) VALUES
('50000000-0000-0000-0000-000000000001', 'Ramesh Patel', '+919900000001', NULL, 'gu', 'Anand', 'Karamsad', 22.560100, 72.930100, 'loam', 2.50, 180000),
('50000000-0000-0000-0000-000000000002', 'Suresh Solanki', '+919900000002', NULL, 'gu', 'Anand', 'Mogri', 22.540300, 72.900200, 'black_cotton', 3.20, 210000),
('50000000-0000-0000-0000-000000000003', 'Mahesh Parmar', '+919900000003', NULL, 'gu', 'Ahmedabad', 'Sanand', 23.000200, 72.400400, 'sandy', 1.70, 125000),
('50000000-0000-0000-0000-000000000004', 'Kalpesh Rabari', '+919900000004', NULL, 'hi', 'Vadodara', 'Padra', 22.220300, 73.080400, 'loam', 4.10, 260000),
('50000000-0000-0000-0000-000000000005', 'Harshad Chauhan', '+919900000005', NULL, 'gu', 'Rajkot', 'Lodhika', 22.240500, 70.760400, 'black_cotton', 2.90, 195000),
('50000000-0000-0000-0000-000000000006', 'Bhavesh Thakor', '+919900000006', NULL, 'en', 'Anand', 'Vallabh Vidyanagar', 22.550100, 72.920100, 'sandy', 1.40, 98000);

INSERT INTO farmer_crops (id, farmer_id, crop_id, area_allocated, season) VALUES
('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1.20, 'rabi'),
('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 1.30, 'kharif'),
('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 2.20, 'kharif'),
('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004', 1.00, 'kharif'),
('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005', 2.50, 'kharif'),
('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000006', 1.80, 'kharif'),
('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 1.40, 'rabi');

INSERT INTO weather_cache (id, location, district, state, temperature, rainfall, humidity, fetched_at, valid_until) VALUES
('70000000-0000-0000-0000-000000000001', 'Anand', 'Anand', 'Gujarat', 34.1, 2.4, 58.0, NOW(), NOW() + INTERVAL '6 hours'),
('70000000-0000-0000-0000-000000000002', 'Ahmedabad', 'Ahmedabad', 'Gujarat', 36.7, 0.4, 44.0, NOW(), NOW() + INTERVAL '6 hours'),
('70000000-0000-0000-0000-000000000003', 'Rajkot', 'Rajkot', 'Gujarat', 35.2, 1.1, 49.0, NOW(), NOW() + INTERVAL '6 hours');

INSERT INTO fvi_records (id, farmer_id, crop_id, score, risk_level, crop_risk, soil_crop_risk, weather_risk, disease_risk, breakdown) VALUES
('80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 42, 'medium', 10, 12, 11, 9, '{"income":8,"loan":5}'),
('80000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 71, 'high', 18, 16, 20, 17, '{"income":10,"loan":8}'),
('80000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004', 29, 'low', 8, 7, 7, 7, '{"income":5,"loan":3}'),
('80000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005', 55, 'medium', 14, 13, 15, 13, '{"income":7,"loan":6}'),
('80000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000006', 67, 'high', 17, 15, 18, 17, '{"income":9,"loan":7}'),
('80000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', 36, 'medium', 9, 10, 9, 8, '{"income":6,"loan":4}');

INSERT INTO disease_records (id, farmer_id, crop_id, disease_name, severity, status, confidence, image_url, detected_at, updated_at) VALUES
('90000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'Bollworm', 'high', 'active', 0.92, 'https://example.com/cotton-bollworm.jpg', NOW() - INTERVAL '1 day', NOW()),
('90000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000006', 'Leaf Spot', 'medium', 'monitoring', 0.78, 'https://example.com/castor-leafspot.jpg', NOW() - INTERVAL '2 days', NOW());

INSERT INTO alerts (id, farmer_id, crop_id, message, reason, risk_level, status) VALUES
('91000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'આવતા 3 દિવસમાં ગરમી વધારે રહેશે. સવારે વહેલી સિંચાઈ કરો.', 'Heat stress advisory', 'medium', 'pending'),
('91000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'કપાસમાં બોલવર્મ જોખમ વધારે છે. ટ્રેપ અને દવા ચકાસો.', 'Pest risk', 'high', 'pending'),
('91000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004', 'વર્ષા ઓછી છે. ભેજ જાળવવા મલ્ચિંગ કરો.', 'Low rainfall', 'medium', 'pending'),
('91000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000005', 'PMFBY માટે દસ્તાવેજ ચકાસી શાખામાં અરજી કરો.', 'Insurance reminder', 'low', 'sent');

INSERT INTO schemes (id, name, description, eligibility_criteria, benefit) VALUES
('92000000-0000-0000-0000-000000000001', 'PM-KISAN', 'Eligible farmers receive direct income support.', 'Landholding farmer with valid records', 'INR 6000 per year'),
('92000000-0000-0000-0000-000000000002', 'PMFBY', 'Crop insurance against weather and pest losses.', 'All notified crop farmers', 'Subsidized premium and risk cover'),
('92000000-0000-0000-0000-000000000003', 'KCC', 'Working capital support for seasonal agriculture.', 'Farmer with cultivation records', 'Low-interest crop loan');

INSERT INTO farmer_schemes (id, farmer_id, scheme_id, status) VALUES
('93000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'eligible'),
('93000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000002', 'applied'),
('93000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', '92000000-0000-0000-0000-000000000003', 'eligible');

INSERT INTO chat_logs (id, farmer_id, message, response, channel) VALUES
('94000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'મારા પાક માટે આજની સલાહ આપો', 'વ્હીટ માટે ભેજ જાળવો અને વધારાનું નાઇટ્રોજન ટાળો.', 'whatsapp');

INSERT INTO voice_logs (id, farmer_id, input_text, output_text, audio_url) VALUES
('95000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'મારે યોજના માહિતી જોઈએ', 'PM-KISAN અને PMFBY માટે તમે પાત્ર છો. નજીકની શાખામાં સંપર્ક કરો.', 'https://example.com/audio/voice1.mp3');

INSERT INTO image_analysis (id, farmer_id, crop_id, image_url, detected_issue, confidence) VALUES
('96000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'https://example.com/images/cotton1.jpg', 'Possible bollworm signs', 0.89);

INSERT INTO notifications (id, farmer_id, type, content, status) VALUES
('97000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'alert', 'નવી હવામાન સલાહ ઉપલબ્ધ છે.', 'sent'),
('97000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'scheme', 'PMFBY અરજી માટે દસ્તાવેજ અધૂરા છે.', 'sent');

COMMIT;
