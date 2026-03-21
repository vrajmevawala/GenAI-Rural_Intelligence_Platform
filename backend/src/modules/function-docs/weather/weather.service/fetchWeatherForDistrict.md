# fetchWeatherForDistrict

## Location
- Source: weather/weather.service.js
- Lines: 12-31

## Signature
```js
fetchWeatherForDistrict(district, lat, long, state)
```

## How It Works (Actual Flow)
- Validates state and throws typed errors for failure cases.
- Calls external services/integrations during processing.

## Parameters
- district
- lat
- long
- state

## Implementation Snapshot
```js
async function fetchWeatherForDistrict(district, lat, long, state) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.current) throw new Error("Invalid weather data");

    const payload = {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      rainfall: data.current.precipitation
    };

    return await updateWeather(district, payload, state);
  } catch (err) {
    console.error(`Failed to fetch weather for ${district}:`, err.message);
    throw err;
  }
}
```
