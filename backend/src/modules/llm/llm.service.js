const { AppError } = require("../../middleware/errorHandler");

/**
 * Service to interact with LLM (Groq/xAI)
 */
async function generateAdviceFromLLM(data) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("GROQ_API_KEY not found in environment variables. Returning fallback advice.");
    return "Please lookout for your crops and monitor conditions.";
  }

  const prompt = `
You are an agricultural expert helping Indian farmers.

DATA:
- FVI Score: ${data.fvi_score} (${data.risk_level})
- Crop: ${data.crop}
- Soil Type: ${data.soil}
- Weather: ${data.weather}
- Disease: ${data.disease}

INSTRUCTIONS:
- Explain why the risk is high/medium/low
- Give 2–3 actionable steps
- Use simple language
- Avoid technical jargon
- Keep response short (5–6 lines max)
- First Gujarati, then English

OUTPUT FORMAT:

Gujarati:
...

English:
...
`;

  try {
    // Using Groq API endpoint (OpenAI compatible)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Valid Groq model
        messages: [
          { role: "system", content: "You are an agricultural expert helping Indian farmers." },
          { role: "user", content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("LLM API Error:", errorData);
      return "Please lookout for your crops and monitor conditions.";
    }

    const result = await response.json();
    return result.choices[0].message.content.trim();
  } catch (err) {
    console.error("LLM Service Error:", err.message);
    return "Please lookout for your crops and monitor conditions.";
  }
}

module.exports = {
  generateAdviceFromLLM
};
