const { info, warn, error } = require("./logger");

// Grok API endpoint (xAI)
const GROK_URL = "https://api.x.ai/v1/chat/completions";
const MODEL_CANDIDATES = [
  process.env.GROK_MODEL,
  "grok-2-latest",
  "grok-3-mini-fast",
  "grok-3-mini",
  "grok-beta"
].filter(Boolean);

/**
 * Call Grok API for dynamic content generation
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt - User request
 * @param {number} maxTokens - Max response tokens
 * @returns {Promise<string>} Generated text
 */
async function callGrok(systemPrompt, userPrompt, maxTokens = 500) {
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey) {
    warn("GROK_API_KEY not configured, falling back to default messages", {
      action: "grok.api.missing"
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
        const response = await fetch(GROK_URL, {
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
            info("Grok call success", {
              model,
              promptLength: userPrompt.length,
              responseLength: text.length,
              attempt: attempts
            });
            return text.trim();
          }
        }

        const body = await response.text();
        const isModelNotFound = response.status === 400 && /model not found/i.test(body);

        if (isModelNotFound) {
          warn("Grok model unavailable, trying next model", {
            model,
            status: response.status
          });
          break;
        }

        if (response.status === 429 || response.status === 503) {
          warn("Grok rate limit/service unavailable, retrying", {
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

        lastError = new Error(`Grok API failed (${model}): ${response.status}`);
        error("Grok API error", {
          model,
          status: response.status,
          body: body.substring(0, 200)
        });
        if (attempts >= 3) break;
      } catch (err) {
        lastError = err;
        error("Grok fetch error", {
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

  throw lastError || new Error("Grok API failed after retries");
}

module.exports = {
  callGrok
};
