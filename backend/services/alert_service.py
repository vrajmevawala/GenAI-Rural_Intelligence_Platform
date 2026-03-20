def get_rural_advice(risk_level: str, language: str = "Gujarati") -> str:
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
        }
    }
    
    lang_advice = advice_map.get(risk_level.upper(), advice_map["LOW"])
    return lang_advice.get(language, lang_advice["Gujarati"])
