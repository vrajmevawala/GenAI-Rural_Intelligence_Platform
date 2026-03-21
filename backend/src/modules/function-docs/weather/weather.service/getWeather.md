# getWeather

## Location
- Source: weather/weather.service.js
- Lines: 4-10

## Signature
```js
getWeather(location)
```

## How It Works (Actual Flow)
- Runs one or more PostgreSQL queries for read/write operations.

## Parameters
- location

## Implementation Snapshot
```js
async function getWeather(location) {
  const { rows } = await pool.query(
    "SELECT * FROM weather_cache WHERE location = $1 OR district = $1",
    [location]
  );
  return rows[0];
}
```
