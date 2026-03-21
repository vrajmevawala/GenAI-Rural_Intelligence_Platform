# getUpcomingExpiries

## Location
- Source: dashboard/dashboard.service.js
- Lines: 16-51

## Signature
```js
getUpcomingExpiries(limit = 6)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Transforms result sets before returning data to caller/UI.

## Parameters
- limit = 6

## Implementation Snapshot
```js
async function getUpcomingExpiries(limit = 6) {
  const cols = await getFarmerColumns();
  const list = [];

  if (cols.has("insurance_expiry_date")) {
    const insuranceRes = await pool.query(
      `SELECT id, name as farmer_name, district,
              insurance_expiry_date as expiry_date,
              'insurance'::text as type
       FROM farmers
       WHERE insurance_expiry_date IS NOT NULL
       ORDER BY insurance_expiry_date ASC
       LIMIT $1`,
      [limit]
    );
    list.push(...insuranceRes.rows.map((r) => ({ ...r, farmer_id: r.id })));
  }

  if (cols.has("loan_due_date")) {
    const loanRes = await pool.query(
      `SELECT id, name as farmer_name, district,
              loan_due_date as expiry_date,
              'loan'::text as type
       FROM farmers
       WHERE loan_due_date IS NOT NULL
       ORDER BY loan_due_date ASC
       LIMIT $1`,
      [limit]
    );
    list.push(...loanRes.rows.map((r) => ({ ...r, farmer_id: r.id })));
```
