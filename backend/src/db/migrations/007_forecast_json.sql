-- Migration: Add forecast_json column to weather_cache table
-- Purpose: Store 15-day forecast data for intelligent alert generation

ALTER TABLE weather_cache 
ADD COLUMN IF NOT EXISTS forecast_json JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN weather_cache.forecast_json IS 
'Daily forecast data from Open-Meteo API: temperature_2m_max, temperature_2m_min, relative_humidity_2m_max, precipitation_sum, windspeed_10m_max';
