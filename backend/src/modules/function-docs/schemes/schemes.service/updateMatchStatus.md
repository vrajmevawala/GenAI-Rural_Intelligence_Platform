# updateMatchStatus

## Location
- Source: schemes/schemes.service.js
- Lines: 51-59

## Signature
```js
updateMatchStatus(matchId, status)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Validates state and throws typed errors for failure cases.

## Parameters
- matchId
- status

## Implementation Snapshot
```js
async function updateMatchStatus(matchId, status) {
  const sql = "UPDATE farmer_schemes SET status = $1 WHERE id = $2 RETURNING *";
  const { rows } = await pool.query(sql, [status, matchId]);
  if (rows.length === 0) throw new AppError("Match not found", 404);
  return {
    ...rows[0],
    application_status: rows[0].status
  };
}
```
