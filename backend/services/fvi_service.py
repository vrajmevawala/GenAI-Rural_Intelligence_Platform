from models import Farmer, Crop

SOIL_CROP_COMPATIBILITY = {
    "rice": {"sandy": 20, "clay": 0, "loamy": 5},
    "groundnut": {"sandy": 0, "clay": 15, "loamy": 5},
    "wheat": {"sandy": 5, "clay": 10, "loamy": 0},
    "cotton": {"sandy": 5, "clay": 10, "loamy": 0}
}

def calculate_fvi(farmer: Farmer, crop: Crop, weather: dict) -> dict:
    """
    Calculates Farmer Vulnerability Index (FVI) based on:
    FVI = base + crop_risk + soil_crop_risk + weather_risk
    """
    base = 30
    
    # 1. Crop Risk (high: +20, medium: +10, low: +0)
    crop_risk = 0
    if crop.risk_level.lower() == "high":
        crop_risk = 20
    elif crop.risk_level.lower() == "medium":
        crop_risk = 10
    
    # 2. Soil-Crop Compatibility (Context-Aware)
    # Default fallback risk is 5
    soil_crop_risk = 5
    crop_name_key = crop.name.lower()
    soil_type_key = farmer.soil_type.lower()
    
    if crop_name_key in SOIL_CROP_COMPATIBILITY:
        soil_crop_risk = SOIL_CROP_COMPATIBILITY[crop_name_key].get(soil_type_key, 5)
    
    # 3. Weather Risk (Crop-Sensitive)
    temp = weather.get("temperature", 30.0)
    rainfall = weather.get("rainfall", 0.0)
    weather_risk = 0

    # Heat Logic
    if temp > 38:
        if crop.heat_tolerance.lower() == "low":
            weather_risk += 20
        elif crop.heat_tolerance.lower() == "medium":
            weather_risk += 10
    elif temp > 32:
        if crop.heat_tolerance.lower() == "low":
            weather_risk += 10
    
    # Rainfall Logic
    if rainfall == 0:
        if crop.water_requirement.lower() == "high":
            weather_risk += 20
        elif crop.water_requirement.lower() == "medium":
            weather_risk += 10
    elif rainfall > 20:
        if crop.water_requirement.lower() == "low":
            weather_risk += 10
    
    # Final Score
    total_score = base + crop_risk + soil_crop_risk + weather_risk
    final_score = min(total_score, 100)

    # Risk Levels (0-30: LOW, 31-60: MEDIUM, 61-80: HIGH, 81-100: CRITICAL)
    risk_level = "LOW"
    if final_score > 80:
        risk_level = "CRITICAL"
    elif final_score > 60:
        risk_level = "HIGH"
    elif final_score > 30:
        risk_level = "MEDIUM"
    
    weather_message = None
    if not weather.get("success", False):
        weather_message = "can not fetch current weather stats , here are previous fvi stats"

    return {
        "fvi_score": float(final_score),
        "risk_level": risk_level,
        "breakdown": {
            "base": base,
            "crop": crop_risk,
            "soil_crop": soil_crop_risk,
            "weather": weather_risk
        },
        "weather": {
            "temperature": temp,
            "rainfall": rainfall
        },
        "weather_message": weather_message
    }
