const { info, error } = require("../../utils/logger");
const { AppError } = require("../../middleware/errorHandler");

/**
 * Batched translation using Microsoft Azure Translator API
 * @param {string[]} texts - Array of strings to translate
 * @param {string} to - Target language code (e.g., 'hi', 'gu')
 */
async function translateBatch(texts, to) {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;

  if (!key || !region) {
    throw new AppError("Azure Translator credentials not configured", 500);
  }

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
    
    // Azure returns [{ translations: [{ text: "...", to: "..." }] }, ...]
    return data.map(item => item.translations[0].text);
  } catch (err) {
    error("Failed to translate via Azure", { error: err.message });
    throw new AppError("Translation service unavailable", 503);
  }
}

module.exports = {
  translateBatch
};
