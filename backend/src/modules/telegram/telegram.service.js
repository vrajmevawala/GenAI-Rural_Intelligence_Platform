const Groq = require("groq-sdk");
const sharp = require("sharp");
const diseaseService = require("../disease/disease.service");
const { info, warn, error } = require("../../utils/logger");

const MODEL_ID = "meta-llama/llama-4-scout-17b-16e-instruct";
const chatLanguagePreferences = new Map();
const RESPONSE_MIN_WORDS = 140;
const RESPONSE_MAX_WORDS = 180;

const SUPPORTED_LANGUAGES = {
  en: "English",
  hin: "Hindi",
  gu: "Gujarati"
};

const MESSAGES = {
  en: {
    start: "👋 Send a crop image and I will detect possible disease and share practical advice.\n🌐 Change language: /lang gu | /lang hin | /lang en",
    noPhoto: "📷 Please send a clear crop image (leaf/plant close-up) for disease prediction.",
    error: "⚠️ Could not analyze the image right now. Please try again with a clearer image.",
    languageUpdated: "✅ Language updated.",
    languageInvalid: "Use: /lang gu | /lang hin | /lang en",
    issueLabel: "Detected Issue",
    analysisLabel: "Analysis",
    adviceLabel: "Advice"
  },
  hin: {
    start: "👋 फसल की तस्वीर भेजें, मैं संभावित रोग पहचानकर उपयोगी सलाह दूंगा।\n🌐 भाषा बदलें: /lang gu | /lang hin | /lang en",
    noPhoto: "📷 कृपया रोग पहचान के लिए फसल की साफ तस्वीर (पत्ता/पौधा क्लोज-अप) भेजें।",
    error: "⚠️ अभी तस्वीर का विश्लेषण नहीं हो सका। कृपया और साफ तस्वीर के साथ फिर कोशिश करें।",
    languageUpdated: "✅ भाषा अपडेट हो गई है।",
    languageInvalid: "इस्तेमाल करें: /lang gu | /lang hin | /lang en",
    issueLabel: "पहचानी गई समस्या",
    analysisLabel: "विश्लेषण",
    adviceLabel: "सलाह"
  },
  gu: {
    start: "👋 કૃપા કરીને પાકનો ફોટો મોકલો, હું સંભવિત રોગ ઓળખીને ઉપયોગી સલાહ આપું છું.\n🌐 ભાષા બદલો: /lang gu | /lang hin | /lang en",
    noPhoto: "📷 રોગ ઓળખ માટે કૃપા કરીને પાકનો સ્પષ્ટ ફોટો (પાન/છોડ ક્લોઝ-અપ) મોકલો.",
    error: "⚠️ હાલમાં ફોટોનું વિશ્લેષણ થઈ શક્યું નથી. કૃપા કરીને વધુ સ્પષ્ટ ફોટા સાથે ફરી પ્રયાસ કરો.",
    languageUpdated: "✅ ભાષા અપડેટ થઈ ગઈ છે.",
    languageInvalid: "આ રીતે લખો: /lang gu | /lang hin | /lang en",
    issueLabel: "ઓળખાયેલી સમસ્યા",
    analysisLabel: "વિશ્લેષણ",
    adviceLabel: "સલાહ"
  }
};

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

function getTelegramToken() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }
  return process.env.TELEGRAM_BOT_TOKEN;
}

async function telegramApi(method, payload = {}) {
  const token = getTelegramToken();
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(`Telegram API ${method} failed: ${json.description || res.statusText}`);
  }

  return json.result;
}

async function getTelegramFileDownloadUrl(fileId) {
  const token = getTelegramToken();
  const file = await telegramApi("getFile", { file_id: fileId });
  if (!file?.file_path) {
    throw new Error("Telegram did not return file path");
  }
  return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
}

async function downloadImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download Telegram image (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function resizeForInference(imageBuffer) {
  return sharp(imageBuffer)
    .rotate()
    .resize({
      width: 672,
      height: 672,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

function parseModelJson(content) {
  try {
    const parsed = JSON.parse(content || "{}");
    return {
      reasoned_text: parsed.reasoned_text || "No detailed reasoning provided.",
      detected_issue: parsed.detected_issue || "Unknown Issue",
      advice: parsed.advice || "Monitor the crop and consult a local expert."
    };
  } catch (e) {
    warn("Failed to parse Groq JSON response", { message: e.message });
    return {
      reasoned_text: "Model response could not be parsed.",
      detected_issue: "Unknown Issue",
      advice: "Try sending a clearer image with leaf/crop close-up."
    };
  }
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function predictionWordCount(prediction) {
  return countWords(`${prediction?.reasoned_text || ""} ${prediction?.advice || ""}`);
}

async function refinePredictionToWordRange(client, prediction, language = "en") {
  const languageName = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.en;

  const completion = await client.chat.completions.create({
    model: MODEL_ID,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `Rewrite this crop diagnosis so that reasoned_text + advice total is strictly ${RESPONSE_MIN_WORDS} to ${RESPONSE_MAX_WORDS} words. Keep detected_issue EXACTLY in English and do not change its meaning. Keep reasoned_text and advice in ${languageName}. If any term does not translate naturally, keep that word in English or Hinglish. Return ONLY JSON with keys: reasoned_text, detected_issue, advice.\n\nInput JSON:\n${JSON.stringify(prediction)}`
      }
    ]
  });

  const content = completion?.choices?.[0]?.message?.content || "{}";
  const refined = parseModelJson(content);
  return {
    reasoned_text: refined.reasoned_text,
    detected_issue: prediction.detected_issue || refined.detected_issue,
    advice: refined.advice
  };
}

function normalizeLanguageCode(value) {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "en";
  if (code.startsWith("gu")) return "gu";
  if (code.startsWith("hin") || code.startsWith("hi")) return "hin";
  return "en";
}

function detectLanguageFromText(text) {
  const input = String(text || "").trim();
  if (!input) return null;

  if (/[\u0A80-\u0AFF]/.test(input)) return "gu";
  if (/[\u0900-\u097F]/.test(input)) return "hin";
  return null;
}

function parseLanguageCommand(text) {
  const value = String(text || "").trim().toLowerCase();
  const match = value.match(/^\/(?:lang|lan|language)(?:@\w+)?\s+(gu|hin|hi|en)$/i);
  if (!match) return null;
  return normalizeLanguageCode(match[1]);
}

function getPreferredLanguage(message) {
  const chatId = String(message?.chat?.id || "");
  const preferred = chatId ? chatLanguagePreferences.get(chatId) : null;
  const byTelegramProfile = normalizeLanguageCode(message?.from?.language_code);
  const fromText = detectLanguageFromText(`${message?.text || ""} ${message?.caption || ""}`);
  return preferred || fromText || byTelegramProfile || "en";
}

function getMessagePack(language) {
  return MESSAGES[language] || MESSAGES.en;
}

async function predictDiseaseFromImage(imageBuffer, language = "en") {
  const client = getGroqClient();
  const base64Image = imageBuffer.toString("base64");
  const languageName = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.en;

  const completion = await client.chat.completions.create({
    model: MODEL_ID,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze the crop disease in this image. Respond in ${languageName}. Return JSON with exactly these fields: reasoned_text (in-depth technical analysis in ${languageName}), detected_issue (specific 3-5 word disease/issue, ALWAYS in English), advice (detailed actionable steps for farmer in ${languageName}). Keep reasoned_text + advice total between ${RESPONSE_MIN_WORDS} and ${RESPONSE_MAX_WORDS}. If any term does not translate naturally, keep that word in English or Hinglish.`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ]
  });

  const content = completion?.choices?.[0]?.message?.content || "{}";
  let prediction = parseModelJson(content);

  const totalWords = predictionWordCount(prediction);
  if (totalWords < RESPONSE_MIN_WORDS || totalWords > RESPONSE_MAX_WORDS) {
    prediction = await refinePredictionToWordRange(client, prediction, language);
  }

  return prediction;
}

function formatPredictionMessage(prediction, language = "en") {
  const t = getMessagePack(language);
  return [
    `🌿 ${t.issueLabel}: ${prediction.detected_issue}`,
    "",
    `🔍 ${t.analysisLabel}: ${prediction.reasoned_text}`,
    "",
    `✅ ${t.adviceLabel}: ${prediction.advice}`
  ].join("\n");
}

async function processTelegramUpdate(update) {
  const message = update?.message;
  if (!message?.chat?.id) {
    return { handled: false, reason: "No message/chat payload" };
  }

  const chatId = message.chat.id;
  const text = String(message.text || "").trim();
  const commandLanguage = parseLanguageCommand(text);
  if (commandLanguage) {
    chatLanguagePreferences.set(String(chatId), commandLanguage);
    const commandPack = getMessagePack(commandLanguage);
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: `${commandPack.languageUpdated}\n${commandPack.start.split("\n")[1]}`
    });
    return { handled: true, type: "language_changed", language: commandLanguage };
  }

  const language = getPreferredLanguage(message);
  const t = getMessagePack(language);

  if (text.startsWith("/lang") || text.startsWith("/lan") || text.startsWith("/language")) {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: t.languageInvalid
    });
    return { handled: true, type: "language_invalid" };
  }

  if (text.startsWith("/")) {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: t.languageInvalid
    });
    return { handled: true, type: "unknown_command" };
  }

  if (text === "/start") {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: t.start
    });
    return { handled: true, type: "start" };
  }

  if (!Array.isArray(message.photo) || message.photo.length === 0) {
    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: t.noPhoto
    });
    return { handled: true, type: "no_photo" };
  }

  const bestPhoto = message.photo[message.photo.length - 1];

  try {
    await telegramApi("sendChatAction", { chat_id: chatId, action: "typing" });

    const imageUrl = await getTelegramFileDownloadUrl(bestPhoto.file_id);
    const originalBuffer = await downloadImageBuffer(imageUrl);
    const resizedBuffer = await resizeForInference(originalBuffer);

    const prediction = await predictDiseaseFromImage(resizedBuffer, language);

    await diseaseService.createDiseaseRecord({
      farmer_id: null,
      crop_id: null,
      disease_name: prediction.detected_issue,
      severity: "medium",
      status: "DETECTED",
      confidence: 0.8,
      image_url: imageUrl
    });

    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: formatPredictionMessage(prediction, language)
    });

    info("Telegram disease prediction success", {
      chatId,
      detectedIssue: prediction.detected_issue,
      language
    });

    return { handled: true, type: "prediction", prediction };
  } catch (err) {
    error("Telegram disease prediction failed", { message: err.message, chatId });

    await telegramApi("sendMessage", {
      chat_id: chatId,
      text: t.error
    });

    return {
      handled: true,
      type: "error",
      error: err.message
    };
  }
}

async function listVisionModels() {
  const client = getGroqClient();
  const models = await client.models.list();
  return (models?.data || [])
    .map((m) => m.id)
    .filter((id) => id.includes("llama-4") || id.includes("scout"));
}

async function setTelegramWebhook(webhookUrl) {
  if (!webhookUrl) {
    throw new Error("webhookUrl is required");
  }

  const cleanUrl = String(webhookUrl).trim();
  if (!/^https:\/\//i.test(cleanUrl)) {
    throw new Error("Webhook URL must be https");
  }

  return telegramApi("setWebhook", { url: cleanUrl });
}

module.exports = {
  MODEL_ID,
  processTelegramUpdate,
  listVisionModels,
  setTelegramWebhook
};
