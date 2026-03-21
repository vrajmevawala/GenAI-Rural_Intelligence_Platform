# mapFarmerPayload

## Location
- Source: farmers/farmers.service.js
- Lines: 29-56

## Signature
```js
mapFarmerPayload(payload = {})
```

## How It Works (Actual Flow)
- Implements module-specific business logic and returns computed result.

## Parameters
- payload = {}

## Implementation Snapshot
```js
function mapFarmerPayload(payload = {}) {
  return {
    name: payload.name,
    phone: normalizePhoneNumber(payload.phone),
    password: payload.password || null,
    language: payload.language || payload.preferred_language || "en",
    district: payload.district || null,
    village: payload.village || null,
    latitude: payload.latitude || null,
    longitude: payload.longitude || null,
    aadhaar_last4: payload.aadhaar_last4 || null,
    soil_type: payload.soil_type || null,
    land_size: payload.land_size ?? payload.land_area_acres ?? null,
    annual_income: payload.annual_income ?? payload.annual_income_inr ?? null,
    taluka: payload.taluka || null,
    primary_crop: payload.primary_crop || null,
    secondary_crop: payload.secondary_crop || null,
    irrigation_type: payload.irrigation_type || null,
    family_size: payload.family_size ?? null,
    loan_amount_inr: payload.loan_amount_inr ?? payload.loan_amount ?? null,
    loan_type: payload.loan_type || null,
    loan_due_date: payload.loan_due_date || null,
    has_crop_insurance: payload.has_crop_insurance ?? null,
    insurance_expiry_date: payload.insurance_expiry_date || null,
    pm_kisan_enrolled: payload.pm_kisan_enrolled ?? null,
    bank_account_number: payload.bank_account_number || null
  };
}
```
