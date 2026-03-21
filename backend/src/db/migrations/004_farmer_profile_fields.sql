-- Add missing farmer profile/financial fields used by the web form.

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS taluka VARCHAR(80);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS primary_crop VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS secondary_crop VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS irrigation_type VARCHAR(60);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS family_size INTEGER;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS loan_amount_inr NUMERIC;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS loan_type VARCHAR(60);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS loan_due_date DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS has_crop_insurance BOOLEAN DEFAULT false;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS pm_kisan_enrolled BOOLEAN DEFAULT false;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(40);
