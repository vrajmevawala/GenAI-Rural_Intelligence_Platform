def get_rural_advice(risk_level: str, weather: dict, language: str = "Gujarati") -> str:
    # Weather-specific logic
    temp = weather.get("temperature", 30)
    rainfall = weather.get("rainfall", 0)

    if temp > 32 and rainfall == 0:
        if language == "Gujarati":
            return "Hal garmi vadhi rahi che ane varsad nathi. Turant irrigation karo."
        else:
            return "Extreme heat and no rain detected. Start irrigation immediately."
    
    # Only show moderate weather message if not in high/critical risk
    if 25 <= temp <= 32 and risk_level not in ["HIGH", "CRITICAL"]:
        if language == "Gujarati":
            return "Hava saman che pan dhyan rakho."
        else:
            return "Weather is moderate but keep an eye out."

    advice_map = {
        "LOW": {
            "Gujarati": "તમારી પાક સુરક્ષિત છે. નિયમિત તપાસ ચાલુ રાખો.",
            "English": "Your crop is safe. Continue regular monitoring."
        },
        "MEDIUM": {
            "Gujarati": "પાકની કાળજી લો. હવામાનની આગાહી તપાસો.",
            "English": "Take care of the crop. Check the daily weather forecast."
        },
        "HIGH": {
            "Gujarati": "સાવધાન! રોગચાળાની શક્યતા છે. કૃષિ નિષ્ણાતની સલાહ લો.",
            "English": "Warning! High risk of pests. Consult an agricultural expert immediately."
        },
        "CRITICAL": {
            "Gujarati": "ગંભીર પરિસ્થિતિ! પાક નિષ્ફળ જઈ શકે છે. સરકારી યોજનાઓ તપાસો.",
            "English": "Critical Situation! Crop failure risk is high. Check government support schemes."
        }
    }
    
    lang_advice = advice_map.get(risk_level.upper(), advice_map["LOW"])
    return lang_advice.get(language, lang_advice["Gujarati"])
