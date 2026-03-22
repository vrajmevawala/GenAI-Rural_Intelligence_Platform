-- Migration: Add support for intelligent alert types
-- Date: March 22, 2026
-- Purpose: Update CHECK constraint to allow new intelligent alert types
--          (crop_disease_risk, weather_extreme, soil_health, pest_outbreak, 
--           harvest_advisory, vulnerability_spike, irrigation_advisory, 
--           fertilizer_advisory, sowing_advisory, market_price)

-- Drop old constraint that only allowed legacy alert types
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;

-- Add new constraint allowing both legacy and intelligent alert types
ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN (
    -- Legacy alert types
    'score_change', 'loan_overdue', 'insurance_expiry',
    'pm_kisan_pending', 'weather_risk', 'scheme_opportunity',
    'officer_callback', 'custom',
    -- Intelligent alert types
    'crop_disease_risk', 'weather_extreme', 'soil_health',
    'pest_outbreak', 'harvest_advisory', 'market_price',
    'vulnerability_spike', 'irrigation_advisory',
    'fertilizer_advisory', 'sowing_advisory'
  ));

-- Verify constraint was added
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'alerts' AND constraint_name = 'alerts_alert_type_check';
