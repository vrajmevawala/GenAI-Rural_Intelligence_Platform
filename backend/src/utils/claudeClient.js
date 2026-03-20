const { info, warn, error } = require("./logger");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

async function callClaude(systemPrompt, userPrompt, maxTokens = 800) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const payload = {
    model: MODEL,
    system: systemPrompt,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ]
  };

  let attempts = 0;
  let delayMs = 500;

  while (attempts < 3) {
    attempts += 1;

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      const text = (data.content || [])
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n")
        .trim();

      const inputTokens = data.usage?.input_tokens || 0;
      const outputTokens = data.usage?.output_tokens || 0;
      info("Claude call success", { inputTokens, outputTokens, maxTokens });

      return text;
    }

    if (response.status === 429 || response.status === 529) {
      warn("Claude rate limit, retrying", { attempt: attempts, status: response.status });
      if (attempts < 3) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
        continue;
      }
    }

    const body = await response.text();
    error("Claude API error", { status: response.status, body });
    throw new Error("Failed to fetch response from Claude API");
  }

  throw new Error("Claude API failed after retries");
}

module.exports = {
  callClaude
};
