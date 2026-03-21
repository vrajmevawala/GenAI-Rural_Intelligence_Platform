-- Add a short human-friendly farmer code while keeping UUID as primary key.

CREATE SEQUENCE IF NOT EXISTS farmers_farmer_code_seq START WITH 1001;

ALTER TABLE farmers
ADD COLUMN IF NOT EXISTS farmer_code INTEGER;

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
