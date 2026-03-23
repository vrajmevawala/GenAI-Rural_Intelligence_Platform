const { info, error, warn } = require("../../utils/logger");
const { AppError } = require("../../middleware/errorHandler");
const { callGroqFast } = require("../../utils/groqClient");

/**
 * Batched translation using Microsoft Azure Translator API with Groq fallback
 * @param {string[]} texts - Array of strings to translate
 * @param {string} to - Target language code (e.g., 'hi', 'gu')
 */
async function translateBatch(texts, to) {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;

  // Use Azure if credentials are provided
  if (key && region) {
    return await translateViaAzure(texts, to, key, region);
  }

  // Fallback to Groq if Azure is not configured
  warn("Azure Translator not configured — using Groq LLM fallback for translation", { targetLang: to });
  return await translateViaGroq(texts, to);
}

async function translateViaAzure(texts, to, key, region) {
  const endpoint = "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0";
  const url = `${endpoint}&to=${to}`;
  const body = texts.map(text => ({ text }));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errBody = await response.text();
      error("Azure Translator API error", { status: response.status, body: errBody });
      throw new Error(`Azure API error: ${response.status}`);
    }

    const data = await response.json();
    return data.map(item => item.translations[0].text);
  } catch (err) {
    error("Failed to translate via Azure", { error: err.message });
    throw new AppError("Translation service unavailable", 503);
  }
}

async function translateViaGroq(texts, to) {
  const langNames = {
    'gu': 'Gujarati',
    'hi': 'Hindi',
    'en': 'English'
  };
  const targetLang = langNames[to] || to;

  const systemPrompt = `You are a professional agricultural translator. 
Translate the following array of JSON objects into ${targetLang}.
Maintain the JSON structure exactly. 
Each object has a "text" field. 
Return ONLY a valid JSON array of objects with the translated "text" field.
Do not add any explanations or preamble.`;

  const userPrompt = JSON.stringify(texts.map(text => ({ text })));

  try {
    const response = await callGroqFast(systemPrompt, userPrompt, 1500);
    
    // Attempt to parse the JSON array from LLM response
    let jsonStr = response.trim();
    // Strip markdown code blocks if any
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    const translatedObjects = JSON.parse(jsonStr);
    
    if (!Array.isArray(translatedObjects)) {
      throw new Error("Groq returned invalid format (not an array)");
    }
    
    return translatedObjects.map(obj => obj.text || "");
  } catch (err) {
    error("Groq translation failed", { error: err.message });
    // If all else fails, return original texts so UI doesn't crash
    warn("Returning original texts as fallback for translation failure");
    return texts;
  }
}

module.exports = {
  translateBatch
};
