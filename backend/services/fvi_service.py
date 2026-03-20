from models import Farmer, Crop

def calculate_fvi(farmer: Farmer, crop: Crop) -> dict:
    score = 30 # base score
    breakdown = {"crop": 0, "soil": 0, "location": 0}

    # Crop Risk
    if crop.risk_level.lower() == "high":
        score += 20
        breakdown["crop"] = 20
    elif crop.risk_level.lower() == "medium":
        score += 10
        breakdown["crop"] = 10
    
    # Soil Type
    if farmer.soil_type.lower() == "sandy":
        score += 15
        breakdown["soil"] = 15
    elif farmer.soil_type.lower() == "clay":
        score += 5
        breakdown["soil"] = 5
    
    # District
    if farmer.district.lower() in ["kutch", "banaskantha", "patan", "anand"]:
        score += 10
        breakdown["location"] = 10
    
    # Cap between 0 and 100
    final_score = max(0, min(100, score))

    # Determine Risk Level
    risk_level = "LOW"
    if final_score >= 60:
        risk_level = "HIGH"
    elif final_score >= 40:
        risk_level = "MEDIUM"
    
    return {
        "fvi_score": final_score,
        "risk_level": risk_level,
        "breakdown": breakdown
    }
