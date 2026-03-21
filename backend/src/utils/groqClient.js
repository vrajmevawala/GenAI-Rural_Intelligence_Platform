const { info, warn, error } = require("./logger");

// Groq API endpoint
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_CANDIDATES = [
  process.env.GROQ_MODEL,
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768"
].filter(Boolean);

/**
 * Call Groq API for dynamic content generation
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt - User request
 * @param {number} maxTokens - Max response tokens
 * @returns {Promise<string>} Generated text
 */
async function callGroq(systemPrompt, userPrompt, maxTokens = 500) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    warn("GROQ_API_KEY not configured", {
      action: "groq.api.missing"
    });
    return null;
  }

  let lastError = null;

  for (const model of MODEL_CANDIDATES) {
    const payload = {
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    };

    let attempts = 0;
    let delayMs = 500;

    while (attempts < 3) {
      attempts += 1;

      try {
        const response = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content || "";

          if (text) {
            info("Groq call success", {
              model,
              promptLength: userPrompt.length,
              responseLength: text.length,
              attempt: attempts
            });
            return text.trim();
          }
        }

        const body = await response.text();
        const isModelNotFound = response.status === 400 && /model|does not exist|invalid model/i.test(body);

        if (isModelNotFound) {
          warn("Groq model unavailable, trying next model", {
            model,
            status: response.status
          });
          break;
        }

        if (response.status === 429 || response.status === 503) {
          warn("Groq rate limit/service unavailable, retrying", {
            model,
            attempt: attempts,
            status: response.status
          });
          if (attempts < 3) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            delayMs *= 2;
            continue;
          }
        }

        lastError = new Error(`Groq API failed (${model}): ${response.status}`);
        error("Groq API error", {
          model,
          status: response.status,
          body: body.substring(0, 200)
        });
        if (attempts >= 3) break;
      } catch (err) {
        lastError = err;
        error("Groq fetch error", {
          model,
          message: err.message,
          attempt: attempts
        });
        if (attempts >= 3) break;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }

  throw lastError || new Error("Groq API failed after retries");
}

module.exports = {
  callGroq
};
