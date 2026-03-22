/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KhedutMitra WhatsApp Bot — RULE-BASED CLASSIFIER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Runs BEFORE Groq to catch obvious queries without AI overhead.
 * Much faster and more reliable than LLM-only classification.
 */

const SOIL_KEYWORDS = [
  'soil', 'soil type', 'mitti', 'jamin', 'jamin no prakar',
  'which soil', 'kaevi jamin', 'kevi jamin', 'kali jamin', 'ret jamin',
  'best soil', 'sandy', 'clay', 'loam', 'black cotton',
  'mate kaevi', 'mate kaevo', 'for tomato soil', 'for wheat soil',
  'soil requirement', 'soil for', 'kaun ki mitti', 'kaun si mitti',
  'mitti ke liye', 'mitti type', 'milon ki mitti'
];

const CROP_SUGGEST_KEYWORDS = [
  'suggest crop', 'which crop', 'kaevo paak', 'su vavvu',
  'kon sa crop', 'best crop', 'crop recommendation', 'crop for',
  'what to grow', 'su ugadvu', 'kaevi kheti', 'crop suggest',
  'kon si kheti', 'suggest me crop', 'for this weather',
  'is season ma', 'kharif crop', 'rabi crop', 'grow what',
  'ganna best', 'kon utam', 'saamai saru', 'suggest karo',
  'which kheti', 'kaun kheti', 'crop ke liye'
];

const WEATHER_ONLY_KEYWORDS = [
  'aaj varsa', 'kal varsa', 'temperature aaj', 'forecast',
  'havaman aaj', 'will it rain', 'kitna rain', 'ketu tapman',
  'barish hogi', 'varsa padse', 'aaj nu havaman', 'aaj temps',
  'temperature ketu', 'kal temperature', 'rainfall aaj',
  'weather aaj', 'aaj khidi', 'paani padse', 'baarish'
];

const DISEASE_KEYWORDS = [
  'rog', 'bimari', 'disease', 'pest', 'insect', 'daag',
  'paan peela', 'leaf', 'fungal', 'attack', 'kido',
  'yellow', 'wilt', 'rot', 'blight', 'virus', 'nuksaan',
  'problem', 'issue', 'spotting', 'wilting', 'browning',
  'rog chhe', 'rogra', 'bimari chhe'
];

const FERTILIZER_KEYWORDS = [
  'khatar', 'fertilizer', 'urea', 'dap', 'npk', 'nutrient',
  'dose', 'spray', 'khad', 'potash', 'nitrogen', 'phosphorus',
  'naakhu', 'naakvo', 'nai khatar', 'konsu khatar',
  'kitna khad', 'khad ke liye', 'fertilizer ke liye'
];

const IRRIGATION_KEYWORDS = [
  'paani', 'paani kedi', 'irrigation', 'water', 'drip',
  'ketla din ma paani', 'paani su rite', 'pani divu',
  'watering', 'drip system', 'canal water', 'borewell'
];

const MARKET_KEYWORDS = [
  'bhav', 'price', 'rate', 'mandi', 'sell', 'market',
  'kema vahechu', 'ketama', 'rupiya', 'income', 'apmc',
  'kapas no bhav', 'ghau no bhav', 'kharedi', 'vikray',
  'rates today', 'current price'
];

function ruleBasedClassify(message) {
  const lower = message.toLowerCase().trim();
  console.log(`[RuleClassify] Testing: "${message}"`);

  // Check soil keywords FIRST — highest priority
  if (SOIL_KEYWORDS.some(kw => lower.includes(kw))) {
    console.log(`[RuleClassify] ✅ Matched SOIL_QUERY`);
    return 'soil_query';
  }
  console.log(`[RuleClassify] ❌ No soil keywords`);

  // Check crop suggestion keywords
  if (CROP_SUGGEST_KEYWORDS.some(kw => lower.includes(kw))) {
    console.log(`[RuleClassify] ✅ Matched CROP_SUGGESTION`);
    return 'crop_suggestion';
  }

  // Check disease keywords
  if (DISEASE_KEYWORDS.some(kw => lower.includes(kw))) {
    console.log(`[RuleClassify] ✅ Matched DISEASE_QUERY`);
    return 'disease_query';
  }

  // Check irrigation keywords
  if (IRRIGATION_KEYWORDS.some(kw => lower.includes(kw))) {
    return 'irrigation_query';
  }

  // Check fertilizer keywords
  if (FERTILIZER_KEYWORDS.some(kw => lower.includes(kw))) {
    return 'fertilizer_query';
  }

  // Check market keywords
  if (MARKET_KEYWORDS.some(kw => lower.includes(kw))) {
    return 'market_price_query';
  }

  // Check weather ONLY if message is ONLY about weather
  if (WEATHER_ONLY_KEYWORDS.some(kw => lower.includes(kw))) {
    console.log(`[RuleClassify] ✅ Matched WEATHER_QUERY`);
    return 'weather_query';
  }

  // Cannot determine — let Groq classify
  console.log(`[RuleClassify] ❌ No rules matched, falling back to Groq`);
  return null;
}

// Extract the ACTUAL CROP mentioned in message — NOT farmer's profile crop
function extractCropFromMessage(message) {
  const lower = message.toLowerCase();

  const cropMap = {
    // English, Gujarati (ગ), Hindi (ह)
    tomato: ['tomato', 'tamatar', 'tameta', 'ટામેટ', 'टमाटर'],
    potato: ['potato', 'aalu', 'bateta', 'બટેટ', 'आलू', 'batata'],
    onion: ['onion', 'dungri', 'pyaz', 'ડુંગળ', 'प्याज', 'kanda'],
    wheat: ['wheat', 'ghau', 'gehu', 'ઘઉ', 'गेहूं'],
    cotton: ['cotton', 'kapas', 'કપાસ', 'कपास'],
    groundnut: ['groundnut', 'peanut', 'mungfali', 'મગફળ', 'मूंगफली', 'magfali'],
    bajra: ['bajra', 'bajri', 'pearl millet', 'બાજર', 'बाजरा'],
    castor: ['castor', 'divela', 'erando', 'દિવેળ', 'अरंडी', 'arandi'],
    sugarcane: ['sugarcane', 'sugar cane', 'ganna', 'sherdi', 'શેરડ', 'गन्ना', 'sakhar'],
    maize: ['maize', 'corn', 'makkai', 'મકાઈ', 'मक्का'],
    rice: ['rice', 'chaval', 'dangar', 'paddy', 'ડાંગ', 'चावल'],
    brinjal: ['brinjal', 'eggplant', 'ringna', 'baingan', 'રીંગણ', 'बैंगन'],
    chilli: ['chilli', 'chili', 'pepper', 'mirchu', 'mirchi', 'મરચ', 'मिर्च'],
    garlic: ['garlic', 'lasan', 'lahsun', 'લસણ', 'लहसुन'],
    cumin: ['cumin', 'jeera', 'jiru', 'જીર', 'जीरा'],
    coriander: ['coriander', 'dhana', 'dhaniya', 'ધાણ', 'धनिया'],
    mango: ['mango', 'keri', 'aam', 'કેર', 'आम'],
    banana: ['banana', 'kela', 'keda', 'કેળ', 'केला'],
    papaya: ['papaya', 'papita', 'papay', 'પપૈ', 'पपीता'],
    lemon: ['lemon', 'limbu', 'nimbu', 'લીંબ', 'नींबू'],
    cucumber: ['cucumber', 'kakdi', 'kheera', 'કાકડ', 'खीरा'],
    pumpkin: ['pumpkin', 'kaddu', 'kohlu', 'કોળ', 'कद्दू'],
    okra: ['okra', 'ladyfinger', 'bhindi', 'bhindo', 'ભીંડ', 'भिंडी'],
    mustard: ['mustard', 'sarson', 'sarsva', 'સરસવ', 'सरसों'],
    lentil: ['lentil', 'daal', 'dal', 'masoor', 'મસૂર', 'दाल', 'मसूर'],
    gram: ['gram', 'chana', 'chenna', 'ચણા', 'चना'],
    soybean: ['soybean', 'soya', 'સોયાબીન', 'सोयाबीन'],
    sunflower: ['sunflower', 'surajmukhi', 'સૂરજમુખી', 'सूरजमुखी'],
  };

  for (const [crop, keywords] of Object.entries(cropMap)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return crop;
    }
  }

  return null; // No specific crop mentioned
}

module.exports = { ruleBasedClassify, extractCropFromMessage };
