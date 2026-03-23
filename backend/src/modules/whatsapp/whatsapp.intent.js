const { callGroq } = require('../../utils/groqClient')

const INTENTS = {
  INSURANCE: 'insurance',
  PMKISAN: 'pmkisan',
  WEATHER: 'weather',
  SCHEME: 'scheme',
  PROFILE: 'profile',
  OFFICER: 'officer',
  FINANCIAL: 'financial',
  MENU: 'menu',
  LANGUAGE_GU: 'lang_gu',
  LANGUAGE_HI: 'lang_hi',
  LANGUAGE_EN: 'lang_en',
  LANGUAGE_HINGLISH: 'lang_hinglish',
  YES: 'yes',
  NO: 'no',
  STOP: 'stop',
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
  '7': INTENTS.FINANCIAL,
  '0': INTENTS.MENU,
  'hi': INTENTS.MENU,
  'hii': INTENTS.MENU,
  'hiii': INTENTS.MENU,
  'hello': INTENTS.MENU,
  'hey': INTENTS.MENU,
  'start': INTENTS.MENU,
  'help': INTENTS.MENU,
  'namaste': INTENTS.MENU,
  'main menu': INTENTS.MENU,
  'show menu': INTENTS.MENU,
  'open menu': INTENTS.MENU,
  'नमस्ते': INTENTS.MENU,
  'नमस्कार': INTENTS.MENU,
  'નમસ્તે': INTENTS.MENU,
  'gu': INTENTS.LANGUAGE_GU,
  'gujarati': INTENTS.LANGUAGE_GU,
  'gu ma': INTENTS.LANGUAGE_GU,
  'hin': INTENTS.LANGUAGE_HI,
  'hindi': INTENTS.LANGUAGE_HI,
  'lang hin': INTENTS.LANGUAGE_HI,
  'language hin': INTENTS.LANGUAGE_HI,
  'lang hi': INTENTS.LANGUAGE_HI,
  'language hi': INTENTS.LANGUAGE_HI,
  'en': INTENTS.LANGUAGE_EN,
  'english': INTENTS.LANGUAGE_EN,
  'lang en': INTENTS.LANGUAGE_EN,
  'language en': INTENTS.LANGUAGE_EN,
  'hinglish': INTENTS.LANGUAGE_HINGLISH,
  'lang hinglish': INTENTS.LANGUAGE_HINGLISH,
  'language hinglish': INTENTS.LANGUAGE_HINGLISH,
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
  'stop': INTENTS.STOP,
  'close': INTENTS.STOP,
  'exit': INTENTS.STOP,
  'unsubscribe': INTENTS.STOP,
  'बंद': INTENTS.STOP,
  'બંધ': INTENTS.STOP,
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
    'baat karo', 'वात', 'વાત', 'sahayak'
  ],
  [INTENTS.FINANCIAL]: [
    'financial', 'money', 'bank', 'loan', 'कर्ज', 'કર્જ',
    'kcc', 'otp', 'upi', 'payment', 'digital', 'money', 'paise',
    'પૈસો', 'insurance', 'subsidy', 'सहायता', 'મદદ'
  ]
}

async function detectIntent(userMessage, language, conversationStage) {
  const normalized = String(userMessage || '').trim().toLowerCase()
  const normalizedNoPunct = normalized.replace(/[!?.:,;]+/g, '').trim()

  // === LAYER 1: EXACT KEYWORD MATCHES (Menu numbers, language switches) ===
  // These ALWAYS match and are high-confidence menu commands
  if (KEYWORD_MAP[normalized]) {
    const intent = KEYWORD_MAP[normalized];
    // Language switches are allowed to construct intent
    if (intent && intent.startsWith('lang_')) {
      return { intent, confidence: 1.0, source: 'keyword' }
    }
    // Menu/control commands
    if ([INTENTS.MENU, INTENTS.YES, INTENTS.NO, INTENTS.STOP, INTENTS.APPLY].includes(intent)) {
      return { intent, confidence: 1.0, source: 'keyword' }
    }
    // Menu numbers 1-6 (menu options)
    if (['0', '1', '2', '3', '4', '5', '6'].includes(normalized)) {
      return { intent, confidence: 1.0, source: 'keyword' }
    }
  }

  if (KEYWORD_MAP[normalizedNoPunct]) {
    const intent = KEYWORD_MAP[normalizedNoPunct];
    // Language switches are allowed
    if (intent && intent.startsWith('lang_')) {
      return { intent, confidence: 1.0, source: 'keyword' }
    }
    // Menu/control commands
    if ([INTENTS.MENU, INTENTS.YES, INTENTS.NO, INTENTS.STOP, INTENTS.APPLY].includes(intent)) {
      return { intent, confidence: 1.0, source: 'keyword' }
    }
  }

  // === LAYER 2: Short messages ===
  if (normalized.length < 2) {
    return { intent: INTENTS.OTHER, confidence: 0.5, source: 'default' }
  }

  // === LAYER 3: DEFAULT TO GROQ ===
  // CRITICAL: Route ALL other messages to free-text handler with Groq
  // This ensures NO static menu responses, only dynamic Groq-based answers
  console.log(`[detectIntent] No exact menu match, routing to Groq free-text: "${userMessage}"`);
  return { intent: INTENTS.OTHER, confidence: 0.95, source: 'groq_freetext' };
}

module.exports = { detectIntent, INTENTS }
