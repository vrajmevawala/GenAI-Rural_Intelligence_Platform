import requests

DISTRICT_COORDINATES = {
    "Anand": (22.5645, 72.9289),
    "Ahmedabad": (23.0225, 72.5714),
    "Vadodara": (22.3072, 73.1812)
}

DEFAULT_WEATHER = {
    "temperature": 30.0,
    "rainfall": 0.0
}

def get_weather(district: str) -> dict:
    """
    Fetch current temperature and daily rainfall for a given district.
    Returns:
    {
        "temperature": float,
        "rainfall": float,
        "success": bool
    }
    """
    coords = DISTRICT_COORDINATES.get(district.title())
    if not coords:
        # Fallback if district not in mapping
        return {**DEFAULT_WEATHER, "success": False}

    lat, lon = coords
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": "true",
        "daily": "precipitation_sum",
        "timezone": "auto"
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        temperature = data.get("current_weather", {}).get("temperature", DEFAULT_WEATHER["temperature"])
        rainfall_list = data.get("daily", {}).get("precipitation_sum", [])
        rainfall = rainfall_list[0] if rainfall_list else DEFAULT_WEATHER["rainfall"]

        return {
            "temperature": float(temperature),
            "rainfall": float(rainfall),
            "success": True
        }
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return {**DEFAULT_WEATHER, "success": False}
