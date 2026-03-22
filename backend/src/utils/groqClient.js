const Groq = require("groq-sdk");
const { info, warn, error } = require("./logger");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Primary model — fast and capable
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
// Fallback model if primary fails
const FALLBACK_MODEL = "llama-3.1-8b-instant";

// These phrases indicate a generic response — reject and retry
const GENERIC_PHRASES = [
  "ખેડૂત મિત્રો",
  "tamara khetine",
  "નજીકના બેંક શાખામ",
  "અમે તૈયાર છીએ",
  "ખેતીને આર્થિક",
  "khedut mitro",
  "dear farmer",
  "as a farmer",
  "farming is important",
  "agriculture is the backbone",
  "we are here to help",
  "visit your nearest",
  "please contact",
  "it is important to",
  "you should consider",
  "farmers should",
  "in general",
  "typically",
  "usually farmers"
];

function isGenericResponse(text) {
  const lower = text.toLowerCase();
  return GENERIC_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()));
}

function extractFarmerName(prompt) {
  const match = prompt.match(/(?:Name|નામ|naam):\s*([^\n]+)/i);
  return match ? match[1].trim() : "farmer";
}

/**
 * Call Groq API with intelligent retry and generic response detection
 * Temperature is intentionally LOW (0.4) to reduce hallucination
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt - User request
 * @param {number} maxTokens - Max response tokens
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<string>} Generated text
 */
async function callGroq(systemPrompt, userPrompt, maxTokens = 1024, retries = 3) {
  if (!process.env.GROQ_API_KEY) {
    error("GROQ_API_KEY not configured");
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  let lastText = "";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const model = attempt <= 2 ? PRIMARY_MODEL : FALLBACK_MODEL;

      // TEMPERATURE IS 0.4 — LOW to reduce hallucination and generic responses
      const completion = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.4, // CRITICAL: DO NOT INCREASE — causes generic output
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      lastText = text;

      // REJECT generic responses — retry with stronger prompt
      if (isGenericResponse(text)) {
        warn(`Groq generic response detected on attempt ${attempt} — retrying with stricter prompt`, {
          model,
          attempt
        });

        if (attempt < retries) {
          // Add stronger instruction on retry
          const farmerName = extractFarmerName(userPrompt);
          const stricterAddition = `

============ CRITICAL RETRY INSTRUCTION ============
Your previous response was REJECTED because it was GENERIC.

BANNED words/phrases — DO NOT use:
- "ખેડૂત મિત્રો" — this is for ALL farmers, not this one
- "visit your nearest branch" — name the ACTUAL branch
- "we are here to help" — useless filler
- "it is important" — filler, skip it
- "in general" or "typically" — NO general advice
- Any sentence that works for ANY farmer

MANDATORY — Your response MUST contain:
1. Farmer's actual name: ${farmerName}
2. Their actual crop name
3. Their actual district name
4. At least ONE specific number (₹ amount, temperature, dose, etc.)
5. At least ONE specific product name with exact dose
6. At least ONE specific action with specific timing (TODAY, TOMORROW, etc.)

If you write even one sentence that could apply to a different farmer 
with a different crop, your response FAILS.

NOW WRITE THE ALERT AGAIN with these STRICT rules enforced.
===================================================`;

          // Reconstruct prompt with stricter version
          const stricterPrompt = userPrompt + stricterAddition;
          const strictCompletion = await groq.chat.completions.create({
            model,
            max_tokens: maxTokens,
            temperature: 0.4,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: stricterPrompt }
            ]
          });

          const strictText = strictCompletion.choices[0]?.message?.content?.trim() || "";

          if (!isGenericResponse(strictText)) {
            info(`Groq strict retry successful`, {
              model,
              attempt: attempt + 1,
              tokens: strictCompletion.usage?.total_tokens
            });
            return strictText;
          } else {
            warn(`Groq strict retry still generic — using original attempt ${attempt}`, {
              model
            });
            return lastText;
          }
        }
      }

      info(`Groq call success`, {
        model,
        tokens: completion.usage?.total_tokens,
        attempt,
        isGeneric: false
      });

      return text;
    } catch (err) {
      warn(`Groq attempt ${attempt} failed`, { message: err.message });

      // Rate limit — wait before retry
      if (err.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        if (attempt < retries) continue;
      }

      // Last attempt failed
      if (attempt === retries) {
        error("Groq failed after all retries", { message: err.message });
        throw err;
      }

      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  return lastText;
}

/**
 * Fast Groq call for classification tasks (low temperature, small model)
 * @param {string} systemPrompt - System instructions
 * @param {string} userPrompt - User request
 * @param {number} maxTokens - Max response tokens
 * @returns {Promise<string>} Generated text
 */
async function callGroqFast(systemPrompt, userPrompt, maxTokens = 50) {
  const completion = await groq.chat.completions.create({
    model: FALLBACK_MODEL,
    max_tokens: maxTokens,
    temperature: 0.1, // Low temp for classification tasks
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  info("Groq fast call success", { model: FALLBACK_MODEL });

  return completion.choices[0]?.message?.content?.trim() || "";
}

module.exports = {
  callGroq,
  callGroqFast,
  isGenericResponse
};
