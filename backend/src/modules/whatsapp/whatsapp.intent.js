const { callGroq } = require('../../utils/groqClient')

const INTENTS = {
  INSURANCE: 'insurance',
  PMKISAN: 'pmkisan',
  WEATHER: 'weather',
  SCHEME: 'scheme',
  PROFILE: 'profile',
  OFFICER: 'officer',
  MENU: 'menu',
  LANGUAGE_GU: 'lang_gu',
  LANGUAGE_HI: 'lang_hi',
  LANGUAGE_EN: 'lang_en',
  LANGUAGE_HINGLISH: 'lang_hinglish',
  YES: 'yes',
  NO: 'no',
  APPLY: 'apply',
  IMAGE: 'image',
  OTHER: 'other'
}

const KEYWORD_MAP = {
  '1': INTENTS.INSURANCE,
  '2': INTENTS.PMKISAN,
  '3': INTENTS.WEATHER,
  '4': INTENTS.SCHEME,
  '5': INTENTS.PROFILE,
  '6': INTENTS.OFFICER,
  '0': INTENTS.MENU,
  'gu': INTENTS.LANGUAGE_GU,
  'gujarati': INTENTS.LANGUAGE_GU,
  'gu ma': INTENTS.LANGUAGE_GU,
  'hi': INTENTS.LANGUAGE_HI,
  'hindi': INTENTS.LANGUAGE_HI,
  'en': INTENTS.LANGUAGE_EN,
  'english': INTENTS.LANGUAGE_EN,
  'hinglish': INTENTS.LANGUAGE_HINGLISH,
  'menu': INTENTS.MENU,
  'back': INTENTS.MENU,
  'yes': INTENTS.YES,
  'ha': INTENTS.YES,
  'haa': INTENTS.YES,
  'हा': INTENTS.YES,
  'હા': INTENTS.YES,
  'no': INTENTS.NO,
  'na': INTENTS.NO,
  'ना': INTENTS.NO,
  'ના': INTENTS.NO,
  'apply': INTENTS.APPLY
}

const MULTILINGUAL_KEYWORDS = {
  [INTENTS.INSURANCE]: [
    'vimo', 'vima', 'વીમો', 'વીમા', 'insurance', 'bima', 'बीमा',
    'fasal bima', 'pmfby', 'crop insurance', 'fashal'
  ],
  [INTENTS.PMKISAN]: [
    'pmkisan', 'pm kisan', 'kisan', 'किसान', 'ખેડૂત', 'installment',
    'hapato', 'હપ્તો', 'hapata', '2000', 'pm-kisan'
  ],
  [INTENTS.WEATHER]: [
    'havaman', 'હવામાન', 'mausam', 'मौसम', 'weather', 'rain',
    'varsad', 'વરસાદ', 'barish', 'बारिश', 'drought', 'dushkal', 'દુષ્કાળ'
  ],
  [INTENTS.SCHEME]: [
    'yojana', 'yojna', 'scheme', 'योजना', 'યોજના', 'subsidy',
    'sarkar', 'government', 'benefit', 'laabh', 'લાભ'
  ],
  [INTENTS.PROFILE]: [
    'profile', 'maro', 'mara', 'my', 'mari', 'detail',
    'info', 'score', 'vulnerability', 'status'
  ],
  [INTENTS.OFFICER]: [
    'officer', 'bank', 'contact', 'call', 'phone', 'baat',
    'baat karo', 'वात', 'વાત', 'sahayak', 'help'
  ]
}

async function detectIntent(userMessage, language, conversationStage) {
  const normalized = String(userMessage || '').trim().toLowerCase()

  if (KEYWORD_MAP[normalized]) {
    return { intent: KEYWORD_MAP[normalized], confidence: 1.0, source: 'keyword' }
  }

  for (const [intent, keywords] of Object.entries(MULTILINGUAL_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return { intent, confidence: 0.9, source: 'keyword' }
    }
  }

  if (normalized.length < 2) {
    return { intent: INTENTS.OTHER, confidence: 0.5, source: 'default' }
  }

  const systemPrompt = `You are an intent classifier for a rural farmer WhatsApp bot in India.
The farmer may write in Gujarati, Hindi, English, or Hinglish.
Classify their message into EXACTLY ONE of these intents:
insurance, pmkisan, weather, scheme, profile, officer, menu,
yes, no, apply, lang_gu, lang_hi, lang_en, lang_hinglish, other.
Current conversation stage: ${conversationStage}
Current language: ${language}
Reply with ONLY the intent word. Nothing else.`

  try {
    const result = await callGroq(
      systemPrompt,
      `Farmer message: "${userMessage}"`,
      20
    )

    const detectedIntent = String(result || '').trim().toLowerCase()
    const validIntents = Object.values(INTENTS)

    if (validIntents.includes(detectedIntent)) {
      return { intent: detectedIntent, confidence: 0.85, source: 'groq' }
    }

    return { intent: INTENTS.OTHER, confidence: 0.5, source: 'groq_fallback' }
  } catch (err) {
    console.error('Intent detection failed:', err.message)
    return { intent: INTENTS.OTHER, confidence: 0.0, source: 'error' }
  }
}

module.exports = { detectIntent, INTENTS }
