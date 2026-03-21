# createFarmer

## Location
- Source: farmers/farmers.service.js
- Lines: 239-297

## Signature
```js
createFarmer(payload)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.
- Transforms result sets before returning data to caller/UI.

## Parameters
- payload

## Implementation Snapshot
```js
async function createFarmer(payload) {
  const columns = await getFarmerColumns();
  const mapped = mapFarmerPayload(payload);

  if (!mapped.name || String(mapped.name).trim().length < 2) {
    throw new AppError("Name is required", 400, "VALIDATION_ERROR");
  }

  if (!mapped.phone || !/^\+\d{10,15}$/.test(mapped.phone)) {
    throw new AppError("Phone must be in E.164 format (e.g. +919876543210)", 400, "VALIDATION_ERROR");
  }

  const id = uuidv4();
  const insertPayload = {
    id,
    name: mapped.name,
    phone: mapped.phone,
    password: mapped.password,
    language: mapped.language,
    district: mapped.district,
    village: mapped.village,
    latitude: mapped.latitude,
    longitude: mapped.longitude,
    aadhaar_last4: mapped.aadhaar_last4,
    soil_type: mapped.soil_type,
    land_size: mapped.land_size,
    annual_income: mapped.annual_income,
    taluka: mapped.taluka,
    primary_crop: mapped.primary_crop,
    secondary_crop: mapped.secondary_crop,
```
