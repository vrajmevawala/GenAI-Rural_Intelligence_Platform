# mapPostgresError

## Location
- Source: farmers/farmers.service.js
- Lines: 58-81

## Signature
```js
mapPostgresError(err)
```

## How It Works (Actual Flow)
- Validates state and throws typed errors for failure cases.

## Parameters
- err

## Implementation Snapshot
```js
function mapPostgresError(err) {
  if (!err || !err.code) return null;

  if (err.code === "23505") {
    if (String(err.constraint || "").includes("phone")) {
      return new AppError("Phone number already exists", 409, "FARMER_PHONE_EXISTS");
    }
    return new AppError("Duplicate value", 409, "DUPLICATE_VALUE");
  }

  if (err.code === "23502") {
    return new AppError(`Missing required field: ${err.column || "unknown"}`, 400, "VALIDATION_ERROR");
  }

  if (err.code === "22P02") {
    return new AppError("Invalid input format", 400, "VALIDATION_ERROR");
  }

  if (err.code === "23503") {
    return new AppError("Cannot delete farmer due to dependent records", 409, "FARMER_HAS_DEPENDENCIES");
  }

  return null;
}
```
