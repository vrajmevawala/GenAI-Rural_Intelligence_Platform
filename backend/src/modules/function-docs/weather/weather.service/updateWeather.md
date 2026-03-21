# updateWeather

## Location
- Source: weather/weather.service.js
- Lines: 33-56

## Signature
```js
updateWeather(location, payload, state = null)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.
- Calls external services/integrations during processing.

## Parameters
- location
- payload
- state = null

## Implementation Snapshot
```js
async function updateWeather(location, payload, state = null) {
  const existing = await getWeather(location);
  const validUntil = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour cache

  if (existing) {
    const { rows } = await pool.query(
      `UPDATE weather_cache 
       SET temperature = $1, rainfall = $2, humidity = $3, fetched_at = NOW(), valid_until = $4
       WHERE id = $5
       RETURNING *`,
      [payload.temperature, payload.rainfall, payload.humidity, validUntil, existing.id]
    );
    return rows[0];
  } else {
    const id = uuidv4();
    const { rows } = await pool.query(
      `INSERT INTO weather_cache (id, location, district, state, temperature, rainfall, humidity, fetched_at, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       RETURNING *`,
      [id, location, location, state, payload.temperature, payload.rainfall, payload.humidity, validUntil]
    );
    return rows[0];
  }
}
```
