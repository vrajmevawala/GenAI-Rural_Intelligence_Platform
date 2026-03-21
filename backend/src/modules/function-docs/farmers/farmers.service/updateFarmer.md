# updateFarmer

## Location
- Source: farmers/farmers.service.js
- Lines: 387-426

## Signature
```js
updateFarmer(id, payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- id
- payload

## Implementation Snapshot
```js
async function updateFarmer(id, payload) {
  const columns = await getFarmerColumns();
  const fields = [];
  const values = [];
  let idx = 1;

  const normalizedPayload = {
    ...payload,
    land_size: payload.land_size ?? payload.land_area_acres,
    annual_income: payload.annual_income ?? payload.annual_income_inr,
    loan_amount_inr: payload.loan_amount_inr ?? payload.loan_amount,
    language: payload.language ?? payload.preferred_language
  };

  Object.keys(normalizedPayload).forEach((key) => {
    if (["name", "phone", "password", "language", "district", "village", "taluka", "aadhaar_last4", "primary_crop", "secondary_crop", "irrigation_type", "family_size", "latitude", "longitude", "soil_type", "land_size", "annual_income", "loan_amount_inr", "loan_type", "loan_due_date", "has_crop_insurance", "insurance_expiry_date", "pm_kisan_enrolled", "bank_account_number"].includes(key) && columns.has(key)) {
      fields.push(`${key} = $${idx}`);
      values.push(normalizedPayload[key]);
      idx += 1;
    }
  });

  if (fields.length === 0) return getFarmerById(id);

  values.push(id);
  const sql = `
    UPDATE farmers
    SET ${fields.join(", ")}
    WHERE id = $${idx}
    RETURNING *
```
