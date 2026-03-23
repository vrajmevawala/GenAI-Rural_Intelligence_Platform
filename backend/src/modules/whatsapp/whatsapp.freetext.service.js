/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KhedutMitra WhatsApp Bot — NEW FREE-TEXT HANDLER (COMPLETE REWRITE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CRITICAL CHANGES:
 * 1. Uses rule-based classifier first (no Groq for obvious queries)
 * 2. Extracts ACTUAL crop from message, not from farmer profile
 * 3. Each query type has its own strict handler
 * 4. No generic Groq-based replies — all focused and specific
 */

const { pool } = require('../../config/db');
const { callGroq, callGroqFast } = require('../../utils/groqClient');
const { validateAndLog } = require('../../utils/alertValidator');
const { CROP_KNOWLEDGE } = require('../../utils/cropKnowledge');
const { getWeatherTriggeredDiseases } = require('../../utils/cropKnowledge');
const weatherService = require('../weather/weather.service');
const logger = require('../../utils/logger');
const { ruleBasedClassify, extractCropFromMessage } = require('./whatsapp.rules');

// ═════════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═════════════════════════════════════════════════════════════════════════════════

async function handleFreeText(userMessage, conv) {
  const lang = conv.language || 'gu';
  const langName = getLangName(lang);

  console.log('\n========================================');
  console.log(`[FreeText] Incoming: "${userMessage}"`);
  console.log(`[FreeText] Farmer: ${conv.farmer_name} | Crop: ${conv.primary_crop} | District: ${conv.district}`);
  console.log('========================================');

  try {
    // Step 1: Try rule-based classification FIRST
    const ruleResult = ruleBasedClassify(userMessage);
    const queryType = ruleResult || (await classifyWithGroq(userMessage, lang));
    console.log(`[FreeText] Classified as: "${queryType}"`);

    // Step 2: Extract crop mentioned in message (NOT farmer profile crop)
    const mentionedCrop = extractCropFromMessage(userMessage);
    console.log(`[FreeText] Crop in message: "${mentionedCrop}" | Farmer crop: "${conv.primary_crop}"`);

    // Step 3: Route to specific handler
    let reply;
    switch (queryType) {
      case 'soil_query':
        reply = await handleSoilQuery(userMessage, mentionedCrop, conv, langName, lang);
        break;

      case 'crop_suggestion':
        reply = await handleCropSuggestion(userMessage, conv, langName, lang);
        break;

      case 'weather_query':
        reply = await handleWeatherQuery(userMessage, conv, langName, lang);
        break;

      case 'disease_query':
        reply = await handleDiseaseQuery(
          userMessage,
          mentionedCrop || conv.primary_crop,
          conv,
          langName,
          lang
        );
        break;

      case 'fertilizer_query':
        reply = await handleFertilizerQuery(
          userMessage,
          mentionedCrop || conv.primary_crop,
          conv,
          langName,
          lang
        );
        break;

      case 'market_price_query':
        reply = await handleMarketQuery(
          userMessage,
          mentionedCrop || conv.primary_crop,
          conv,
          langName,
          lang
        );
        break;

      case 'profile_query':
        reply = await handleProfileQuery(conv, langName, lang);
        break;

      case 'irrigation_query':
        reply = await handleIrrigationQuery(
          userMessage,
          mentionedCrop || conv.primary_crop,
          conv,
          langName,
          lang
        );
        break;

      default:
        reply = await handleGeneralQuery(userMessage, conv, langName, lang);
    }

    // SAFETY CHECK: Validate response is relevant to the query
    reply = await validateReplyRelevance(reply, queryType, userMessage, lang, langName);

    console.log(`[FreeText] Reply (${reply?.length} chars): "${reply?.substring(0, 80)}..."`);
    return reply;
  } catch (err) {
    logger.error('Free-text handler error', { error: err.message, message: userMessage });
    throw err;
  }
}

// ═════════════════════════════════════════════════════════════════════════════════
// CLASSIFIER
// ═════════════════════════════════════════════════════════════════════════════════

async function classifyWithGroq(message, lang) {
  console.log(`[GroqClassify] Fallback called: "${message}"`);
  const systemPrompt = `Classify the farmer's message into ONE category only. Reply with ONLY the category name (no explanation).

CRITICAL: If asking about rain, weather, temperature, or forecast → weather_query
CRITICAL: If asking HOW to water or irrigation methods → irrigation_query (only if asking how, not if it will rain)

Categories:
soil_query | weather_query | crop_suggestion | disease_query | fertilizer_query
irrigation_query | market_price_query | profile_query | general_farming`;

  try {
    const result = await callGroqFast(systemPrompt, `Classify: "${message}"`, 25);
    const cleaned = result.trim().toLowerCase().split('\n')[0].split(' ')[0].replace(/[^a-z_]/g, '');
    console.log(`[GroqClassify] Classified as: "${cleaned}"`);
    
    // Validate result
    const validCategories = ['soil_query', 'crop_suggestion', 'weather_query', 'disease_query', 
                            'fertilizer_query', 'irrigation_query', 'market_price_query', 
                            'profile_query', 'general_farming'];
    if (!validCategories.includes(cleaned)) {
      console.warn(`[GroqClassify] Invalid category detected: "${cleaned}", defaulting to general_farming`);
      return 'general_farming';
    }
    return cleaned;
  } catch (e) {
    logger.warn('Groq classification failed', { error: e.message, message });
    return 'general_farming';
  }
}

// ═════════════════════════════════════════════════════════════════════════════════
// VALIDATION: Check if reply is on-topic
// ═════════════════════════════════════════════════════════════════════════════════

async function validateReplyRelevance(reply, queryType, userMessage, lang, langName) {
  if (!reply || typeof reply !== 'string') return reply;

  const lower = reply.toLowerCase();
  const msgLower = userMessage.toLowerCase();

  // For soil queries, make sure response actually mentions soil or crop
  if (queryType === 'soil_query') {
    const soilKeywords = ['mitti', 'soil', 'jamin', 'जमीन', 'કારણ', 'માટી'];
    const hasSoilContent = soilKeywords.some(kw => lower.includes(kw));
    if (!hasSoilContent) {
      return getNotAvailableResponse(queryType, lang);
    }
  }

  // For disease queries, ensure response mentions symptoms or treatment
  if (queryType === 'disease_query') {
    const diseaseKeywords = ['rog', 'disease', 'treat', 'spray', 'proof', 'management', 'संरक्षण'];
    const hasContent = diseaseKeywords.some(kw => lower.includes(kw));
    if (!hasContent) {
      return getNotAvailableResponse(queryType, lang);
    }
  }

  // For fertilizer queries, ensure response mentions fertilizer/nutrients
  if (queryType === 'fertilizer_query') {
    const fertKeywords = ['khad', 'khatar', 'fertilizer', 'nutrient', 'urea', 'dap', 'खाद', 'पोषक'];
    const hasContent = fertKeywords.some(kw => lower.includes(kw));
    if (!hasContent) {
      return getNotAvailableResponse(queryType, lang);
    }
  }

  // Generic check: if response mentions schemes/loans when it shouldn't, reject it
  const schemeKeywords = ['pmfby', 'pm-kisan', 'kcc', 'subsidy', 'योजना', 'યોજના'];
  const hasSchemeContent = schemeKeywords.some(kw => lower.includes(kw));
  
  if (hasSchemeContent && !queryType.includes('scheme') && !queryType.includes('profile')) {
    return getNotAvailableResponse(queryType, lang);
  }

  return reply;
}

function getNotAvailableResponse(queryType, lang) {
  const responses = {
    gu: `માફ કરશો, આ પ્રશ્ન માટે મારી પાસે પર્યાપ્ત સંસાધનો નથી. 

કૃપા કરીને બેંક અધિકારીથી સંપર્ક કરો.
0 menu | 6 officer`,
    
    hi: `किसान भाई, इस सवाल का जवाब देने के लिए मेरे पास पर्याप्त जानकारी नहीं है।

कृपया बैंक अधिकारी से संपर्क करें।
0 menu | 6 officer`,
    
    en: `Friend, I don't have enough resources for this question.

Please contact your bank officer.
0 menu | 6 officer`
  };
  
  return responses[lang] || responses.en;
}

// ═════════════════════════════════════════════════════════════════════════════════
// HANDLER: SOIL QUERY
// ═════════════════════════════════════════════════════════════════════════════════

async function handleSoilQuery(userMessage, mentionedCrop, conv, langName, lang) {
  const cropToAsk = mentionedCrop;

  // If no crop mentioned, ask which one
  if (!cropToAsk) {
    const askMsg = {
      gu: `${conv.farmer_name}bhai, kaeva paak mate jamin ni jankari joie chhe? (Jema ke: tameta, ghau, kapas)\n0 menu | 6 officer`,
      hi: `${conv.farmer_name} ji, kis fasal ke liye mitti ki jaankari chahiye? (Jaise: tamatar, gehu, cotton)\n0 menu | 6 officer`,
      en: `${conv.farmer_name}, which crop soil info do you need? (e.g. tomato, wheat, cotton)\n0 menu | 6 officer`,
    };
    return askMsg[lang] || askMsg.en;
  }

  // Get soil data for this crop
  const cropInfo = CROP_KNOWLEDGE[cropToAsk];
  const bestSoil = getBestSoilForCrop(cropToAsk);
  const cropGujarati = cropInfo?.gujarati_name || cropToAsk;

  const systemPrompt = `You are KhedutMitra bot. Answer ONLY about soil for ${cropToAsk} (${cropGujarati}).
STRICT RULES:
- Reply ONLY in ${langName}
- Do NOT mention weather, temperature, °C, rain, or irrigation
- Do NOT mention any other crop (like sugarcane)
- MUST include farmer name: "${conv.farmer_name}"
- MUST include crop: "${cropToAsk}" or "${cropGujarati}"
- MUST include ONE soil type name in Gujarati (રેતાળ, કાળી, ગોરાળુ, etc)
- Plain text, no asterisks, max 320 characters
- End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"
- BANNED: temperature, weather, °C, rainfall, varsa, havaman, degree`;

  const userPrompt = `
QUESTION: "${userMessage}"
THIS IS ABOUT: Soil for ${cropToAsk} (${cropGujarati})

SOIL DATA FOR ${cropToAsk.toUpperCase()}:
Best soil: ${bestSoil}
Sandy: ${cropInfo?.soil_requirements?.sandy || 'moderate'}
Clay: ${cropInfo?.soil_requirements?.clay || 'needs drainage'}
Loam: ${cropInfo?.soil_requirements?.loam || 'good'}
Black cotton: ${cropInfo?.soil_requirements?.black_cotton || 'moderate'}

FARMER'S SOIL: ${conv.soil_type} (${getSoilGujarati(conv.soil_type)})
Good for ${cropToAsk}? ${cropInfo?.soil_requirements?.[conv.soil_type?.toLowerCase()] || 'check drainage'}

REPLY IN ${langName}:
1. Best soil for ${cropToAsk}
2. Is ${conv.soil_type} soil suitable? YES/NO + why
3. What to add if not ideal
4. One soil prep tip
End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"

NO WEATHER TALK. NO TEMPERATURE. ONLY SOIL.`;

  return await callGroq(systemPrompt, userPrompt, 400);
}

// ═════════════════════════════════════════════════════════════════════════════════
// HANDLER: CROP SUGGESTION
// ═════════════════════════════════════════════════════════════════════════════════

async function handleCropSuggestion(userMessage, conv, langName, lang) {
  // Fetch REAL weather data
  let weatherText = 'weather data unavailable';
  try {
    const weather = await weatherService.getWeatherByDistrictName(conv.district);
    const temp = weather?.forecast_json?.daily?.temperature_2m_max?.[0];
    const humidity = weather?.forecast_json?.daily?.relative_humidity_2m_max?.[0];
    const rainfall7d = (weather?.forecast_json?.daily?.precipitation_sum || [])
      .slice(0, 7)
      .reduce((a, b) => a + (b || 0), 0);
    weatherText = `${temp}°C temp, ${humidity}% humidity, ${rainfall7d?.toFixed(0)}mm rainfall last 7 days, drought risk: ${weather?.drought_risk_level}`;
  } catch (e) {
    logger.warn('[CropSuggestion] Weather fetch failed', { error: e.message });
  }

  // Get suitable crops
  const month = new Date().getMonth() + 1;
  const season =
    month >= 6 && month <= 10 ? 'kharif' : month >= 11 || month <= 3 ? 'rabi' : 'zaid';
  const suitableCrops = getSuitableCropsForSoil(conv.soil_type, season);

  const systemPrompt = `You are KhedutMitra bot. Suggest crops in ${langName}.
STRICT RULES:
- MUST mention farmer name: "${conv.farmer_name}"
- MUST mention district: "${conv.district}"
- MUST mention soil: "${conv.soil_type}"
- MUST use REAL numbers below, not make up weather
- Suggest exactly 2 crops with ₹ income per acre
- Plain text, no asterisks, max 380 characters
- End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"
- BANNED: "in general", "typically", "visit your bank"`;

  const userPrompt = `
QUESTION: "${userMessage}"
FARMER: ${conv.farmer_name} | ${conv.district} | Soil: ${conv.soil_type} | Land: ${conv.land_area_acres} acres

LIVE WEATHER FOR ${conv.district}:
${weatherText}

SEASON: ${season}

BEST CROPS FOR ${conv.soil_type?.toUpperCase()} IN ${season?.toUpperCase()}:
1. ${suitableCrops[0]?.name} (${suitableCrops[0]?.gujarati}) — ₹${suitableCrops[0]?.income}/acre
   Why: ${suitableCrops[0]?.reason}
2. ${suitableCrops[1]?.name} (${suitableCrops[1]?.gujarati}) — ₹${suitableCrops[1]?.income}/acre
   Why: ${suitableCrops[1]?.reason}

WRITE IN ${langName}:
Start: "${conv.farmer_name}bhai/ben, ${conv.district} ma aaj [actual temp]°C + [weather]"
Suggest: Crop 1 + why + ₹ income
Suggest: Crop 2 + why + ₹ income
End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"

USE EXACT NUMBERS: ${weatherText}`;

  return await callGroq(systemPrompt, userPrompt, 500);
}

// ═════════════════════════════════════════════════════════════════════════════════
// HANDLER: WEATHER QUERY
// ═════════════════════════════════════════════════════════════════════════════════

async function handleWeatherQuery(userMessage, conv, langName, lang) {
  // Extract crop if mentioned in message (e.g., "weather for cotton")
  const mentionedCrop = extractCropFromMessage(userMessage);
  const targetCrop = mentionedCrop || conv.primary_crop;
  const cropInfo = CROP_KNOWLEDGE[targetCrop?.toLowerCase()];
  const cropGujarati = cropInfo?.gujarati_name || targetCrop;

  // Try to extract district from message
  const mentionedDistrict = await extractDistrictFromMessage(userMessage, conv.district);

  let weatherData = null;
  try {
    weatherData = await weatherService.getWeatherByDistrictName(mentionedDistrict);
  } catch (e) {
    const errorMsg = {
      gu: `${conv.farmer_name}bhai, ${mentionedDistrict} nu havaman data available nathi. Thodi var pachhi try karo.\n0 menu | 6 officer`,
      en: `${conv.farmer_name}, weather data for ${mentionedDistrict} unavailable. Try again shortly.\n0 menu | 6 officer`,
    };
    return errorMsg[lang] || errorMsg.en;
  }

  const forecast = weatherData?.forecast_json?.daily || {};
  const temp = forecast.temperature_2m_max?.[0];
  const tempMin = forecast.temperature_2m_min?.[0];
  const rain = forecast.precipitation_sum?.[0];
  const humidity = forecast.relative_humidity_2m_max?.[0];
  const windspeed = forecast.windspeed_10m_max?.[0];
  const drought = weatherData?.drought_risk_level;

  // Build crop-specific system prompt
  let cropContext = '';
  if (mentionedCrop) {
    cropContext = `\n- CRITICAL: Question is specifically about "${targetCrop}" (${cropGujarati}) crop
- MUST focus ALL advice on this crop only
- Use crop-specific farming practices for ${targetCrop}`;
  }

  const systemPrompt = `You are KhedutMitra bot. Give weather in ${langName}.
STRICT RULES:
- Use ONLY these exact numbers (DO NOT change them):
  Max temp: ${temp}°C, Min: ${tempMin}°C, Today rain: ${rain}mm, Humidity: ${humidity}%, Drought: ${drought}
- MUST mention "${mentionedDistrict}" district
- MUST mention "${conv.farmer_name}"
- Plain text, no asterisks, max 320 characters
- End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"
- DO NOT invent any numbers${cropContext}`;

  const userPrompt = `
QUESTION: "${userMessage}"
DISTRICT: ${mentionedDistrict}
FARMER: ${conv.farmer_name}
CROP: ${targetCrop} (${cropGujarati})

REAL WEATHER DATA:
Max: ${temp}°C, Min: ${tempMin}°C, Rain: ${rain}mm, Humidity: ${humidity}%, Drought: ${drought}

${mentionedCrop 
  ? `Weather forecast for ${targetCrop} (${cropGujarati}) farming in ${mentionedDistrict}.\nInclude specific action/timing recommendation for this crop based on current weather.`
  : `Summary for ${mentionedDistrict} in ${langName}.\nInclude farming tip for ${conv.primary_crop} crop.`}
Use EXACT numbers only.`;

  return await callGroq(systemPrompt, userPrompt, 400);
}

// ═════════════════════════════════════════════════════════════════════════════════
// HANDLER: DISEASE QUERY
// ═════════════════════════════════════════════════════════════════════════════════

async function handleDiseaseQuery(userMessage, targetCrop, conv, langName, lang) {
  const cropInfo = CROP_KNOWLEDGE[targetCrop?.toLowerCase()];
  const cropGujarati = cropInfo?.gujarati_name || targetCrop;

  // Get weather-triggered diseases
  let weather = null;
  try {
    weather = await weatherService.getWeatherByDistrictName(conv.district);
    const temp = weather?.forecast_json?.daily?.temperature_2m_max?.[0] || 28;
    const humidity = weather?.forecast_json?.daily?.relative_humidity_2m_max?.[0] || 65;
    const rainfall = (weather?.forecast_json?.daily?.precipitation_sum || [])
      .slice(0, 7)
      .reduce((a, b) => a + (b || 0), 0);
    const diseases = getWeatherTriggeredDiseases(targetCrop, temp, humidity, rainfall);

    const systemPrompt = `You are KhedutMitra bot. Answer disease question in ${langName}.
STRICT RULES:
- Topic: Disease/pest for ${targetCrop} (${cropGujarati})
- MUST mention farmer: "${conv.farmer_name}"
- MUST mention crop: "${targetCrop}" or "${cropGujarati}"
- MUST include disease name in Gujarati
- MUST include treatment + dose if risk exists
- Plain text, no asterisks, max 350 characters
- End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"
- NO generic tips, NO "visit expert"`;

    const userPrompt = `
QUESTION: "${userMessage}"
CROP: ${targetCrop} (${cropGujarati})
WEATHER: ${temp}°C, ${humidity}% humidity
CONDITIONS: ${rainfall?.toFixed(0)}mm rain in 7 days, drought: ${weather?.drought_risk_level}

HIGH-RISK DISEASES NOW:
${diseases?.slice(0, 2)?.map((d) => `${d.gujarati} (${d.name}): Symptoms=${d.symptoms}, Treatment=${d.treatment}`).join('\n')}

REPLY IN ${langName}:
1. Disease name (Gujarati)
2. Symptoms for ${targetCrop}
3. Treatment + dose
4. When to apply
End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"`;

    return await callGroq(systemPrompt, userPrompt, 400);
  } catch (e) {
    logger.warn('[Disease] Weather fetch failed', { error: e.message });
    // Fallback without weather data
    const systemPrompt = `You are KhedutMitra bot. Disease answer for ${targetCrop} in ${langName}.
MUST: farmer name, crop name, disease in Gujarati, treatment
NO generic tips.`;

    return await callGroq(systemPrompt, `Disease question about ${targetCrop}\n\n${userMessage}`, 350);
  }
}

// ═════════════════════════════════════════════════════════════════════════════════
// HANDLER: FERTILIZER QUERY
// ═════════════════════════════════════════════════════════════════════════════════

async function handleFertilizerQuery(userMessage, targetCrop, conv, langName, lang) {
  const cropInfo = CROP_KNOWLEDGE[targetCrop?.toLowerCase()];
  const cropGujarati = cropInfo?.gujarati_name || targetCrop;

  const systemPrompt = `You are KhedutMitra bot. Fertilizer advice in ${langName}.
STRICT RULES:
- About ${targetCrop} (${cropGujarati}) only
- MUST mention: "${conv.farmer_name}", crop name, soil "${conv.soil_type}"
- MUST include product name + dose per acre in ₹
- MUST say: what to apply NOW, how much, when
- Plain text, no asterisks, max 350 characters
- End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"`;

  const userPrompt = `
QUESTION: "${userMessage}"
CROP: ${targetCrop} (${cropGujarati})
SOIL: ${conv.soil_type}
LAND: ${conv.land_area_acres} acres

FERTILIZER SCHEDULE FOR ${targetCrop.toUpperCase()}:
${cropInfo?.fertilizer_schedule?.map((s) => `${s.das} DAS: ${s.type} (${s.dose})`).join('\n')}

REPLY IN ${langName}:
What to apply NOW + how much (dosage) + cost₹ for their land
When to apply (DAS)
How to apply
End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"`;

  return await callGroq(systemPrompt, userPrompt, 400);
}

// ═════════════════════════════════════════════════════════════════════════════════
// HANDLER: MARKET QUERY
// ═════════════════════════════════════════════════════════════════════════════════

async function handleMarketQuery(userMessage, targetCrop, conv, langName, lang) {
  const cropGujarati = CROP_KNOWLEDGE[targetCrop?.toLowerCase()]?.gujarati_name || targetCrop;
  const prices = getMandiPrices(targetCrop);

  const systemPrompt = `You are KhedutMitra bot. Market price in ${langName}.
STRICT RULES:
- About ${targetCrop} (${cropGujarati}) price
- MUST mention: "${conv.farmer_name}", crop
- Use ONLY prices below, do NOT invent
- Say: current rate + best time to sell
- Plain text, no asterisks, max 300 characters
- End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"`;

  const userPrompt = `
QUESTION: "${userMessage}"
CROP: ${targetCrop}
DISTRICT: ${conv.district}

MANDI PRICES FOR ${targetCrop.toUpperCase()}:
${prices?.map((p) => `${p.market}: ₹${p.min}-${p.max}/quintal`).join('\n')}

REPLY IN ${langName}:
Current rate for ${targetCrop} in ${conv.district}
Good time to sell? (now, wait, hold)
Nearest APMC
End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"`;

  return await callGroq(systemPrompt, userPrompt, 350);
}

// ═════════════════════════════════════════════════════════════════════════════════
// HANDLER: GENERAL QUERY
// ═════════════════════════════════════════════════════════════════════════════════

async function handleGeneralQuery(userMessage, conv, langName, lang) {
  const systemPrompt = `You are KhedutMitra bot. Farm question in ${langName}.
STRICT RULES:
- MUST mention: "${conv.farmer_name}" by name
- MUST mention: "${conv.primary_crop}" or "${conv.district}"
- Answer the SPECIFIC question asked (not generic tips)
- Plain text, no asterisks, max 350 characters
- End: "${lang === 'gu' ? '0 મેનુ | 6 ઓફિસર' : '0 menu | 6 officer'}"
- BANNED: "typically", "in general", "visit expert"`;

  const userPrompt = `
FARMER: ${conv.farmer_name} | ${conv.district} | Crop: ${conv.primary_crop} | Soil: ${conv.soil_type}
QUESTION: "${userMessage}"

Answer in ${langName}. Be specific to ${conv.district} and ${conv.primary_crop}.`;

  return await callGroq(systemPrompt, userPrompt, 400);
}

// PLACEHOLDER HANDLERS (minimal implementation)
async function handleIrrigationQuery(userMessage, targetCrop, conv, langName, lang) {
  const systemPrompt = `Irrigation advice in ${langName}. Max 300 chars. End with menu.`;
  return await callGroq(
    systemPrompt,
    `Irrigation for ${targetCrop}: ${userMessage}`,
    300
  );
}

async function handleProfileQuery(conv, langName, lang) {
  const msg = {
    gu: `${conv.farmer_name}bhai, tamara score ${conv.vulnerability_score}/100 (${conv.vulnerability_label}). Officer sathe contact karo details mate.
0 menu | 6 officer`,
    en: `${conv.farmer_name}, your score is ${conv.vulnerability_score}/100 (${conv.vulnerability_label}). Contact officer for details.
0 menu | 6 officer`,
  };
  return msg[lang] || msg.en;
}

// ═════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════════

async function extractDistrictFromMessage(message, defaultDistrict) {
  const districts = [
    'surat', 'ahmedabad', 'vadodara', 'rajkot', 'anand', 'kheda',
    'mehsana', 'gandhinagar', 'patan', 'banaskantha', 'sabarkantha',
    'aravalli', 'mahisagar', 'chhota udaipur', 'dahod', 'panchmahal',
    'narmada', 'bharuch', 'tapi', 'dang', 'navsari', 'valsad',
    'amreli', 'bhavnagar', 'botad', 'gir somnath', 'junagadh',
    'porbandar', 'jamnagar', 'devbhoomi dwarka', 'morbi', 'surendranagar', 'kutch'
  ];
  const lower = message.toLowerCase();
  const found = districts.find(d => lower.includes(d));
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : defaultDistrict;
}

function getSuitableCropsForSoil(soilType, season) {
  const cropSuitability = {
    sandy: {
      kharif: [
        { name: 'groundnut', gujarati: 'મગફળી', reason: 'રેતાળ માટે ideal', income: '₹25000-35000' },
        { name: 'bajra', gujarati: 'બાજરો', reason: 'drought tolerant', income: '₹12000-18000' }
      ],
      rabi: [
        { name: 'wheat', gujarati: 'ઘઉં', reason: 'sandy loam perfect', income: '₹20000-28000' },
        { name: 'cumin', gujarati: 'જીરૂ', reason: 'sandy soil excellent', income: '₹40000-60000' }
      ]
    },
    black_cotton: {
      kharif: [
        { name: 'cotton', gujarati: 'કપાસ', reason: 'natural habitat', income: '₹30000-50000' },
        { name: 'soybean', gujarati: 'સોયાબીન', reason: 'nitrogen fixing', income: '₹18000-25000' }
      ],
      rabi: [
        { name: 'wheat', gujarati: 'ઘઉં', reason: 'excellent combo', income: '₹22000-30000' },
        { name: 'gram', gujarati: 'ચણા', reason: 'rabi champion', income: '₹15000-22000' }
      ]
    },
    loam: {
      kharif: [
        { name: 'cotton', gujarati: 'કપાસ', reason: 'loam suits cotton', income: '₹28000-45000' },
        { name: 'maize', gujarati: 'મકાઈ', reason: 'ideal for maize', income: '₹15000-22000' }
      ],
      rabi: [
        { name: 'wheat', gujarati: 'ઘઉં', reason: 'best combo', income: '₹22000-32000' },
        { name: 'potato', gujarati: 'બટેટા', reason: 'high value', income: '₹35000-55000' }
      ]
    },
    clay: {
      kharif: [
        { name: 'rice', gujarati: 'ડાંગર', reason: 'clay retains water', income: '₹18000-28000' },
        { name: 'castor', gujarati: 'દિવેળ', reason: 'clay suits', income: '₹20000-30000' }
      ],
      rabi: [
        { name: 'mustard', gujarati: 'સરસવ', reason: 'rabi mustard', income: '₹14000-20000' },
        { name: 'lentil', gujarati: 'મસૂર', reason: 'winter crop', income: '₹12000-18000' }
      ]
    }
  };

  const soil = soilType?.toLowerCase() || 'loam';
  return cropSuitability[soil]?.[season] || cropSuitability.loam.kharif;
}

function getBestSoilForCrop(crop) {
  const bestSoils = {
    tomato: 'loam or sandy loam (ગોરાળુ)',
    potato: 'sandy loam (રેતાળ ગોરાળુ)',
    onion: 'sandy loam (રેતાળ)',
    wheat: 'black cotton or loam (કાળી અથવા ગોરાળુ)',
    cotton: 'black cotton soil (કાળી જમીન)',
    groundnut: 'sandy loam (રેતાળ)',
    bajra: 'sandy (રેતાળ)',
    castor: 'black cotton or loam',
    sugarcane: 'loam (ગોરાળુ)',
    maize: 'loam (ગોરાળુ)',
    rice: 'clay (ભારી)',
    brinjal: 'sandy loam (ગોરાળુ)',
    chilli: 'loam (ગોરાળુ)',
    garlic: 'sandy loam (ગોરાળુ)',
    cumin: 'sandy (રેતાળ)',
  };
  return bestSoils[crop?.toLowerCase()] || 'loam (ગોરાળુ)';
}

function getSoilGujarati(soilType) {
  return {
    sandy: 'રેતાળ',
    clay: 'ભારી',
    loam: 'ગોરાળુ',
    black_cotton: 'કાળી',
  }[soilType?.toLowerCase()] || soilType;
}

function getLangName(code) {
  return { gu: 'Gujarati', hi: 'Hindi', en: 'English', hinglish: 'Hinglish' }[code] || 'Gujarati';
}

function getMandiPrices(crop) {
  const prices = {
    wheat: [{ market: 'Ahmedabad APMC', min: 2200, max: 2400 }],
    cotton: [{ market: 'Rajkot APMC', min: 6200, max: 7000 }],
    groundnut: [{ market: 'Junagadh APMC', min: 5500, max: 6200 }],
    bajra: [{ market: 'Local mandi', min: 1800, max: 2100 }],
    castor: [{ market: 'Rajkot APMC', min: 5800, max: 6500 }],
    maize: [{ market: 'Surat APMC', min: 2100, max: 2400 }],
    rice: [{ market: 'Ahmedabad APMC', min: 2500, max: 2800 }],
    cumin: [{ market: 'Unjha mandi', min: 15000, max: 20000 }],
  };
  return prices[crop?.toLowerCase()] || [{ market: 'Local APMC', min: 1500, max: 2500 }];
}

// ═════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════════════════════════

module.exports = {
  handleFreeText,
  classifyWithGroq,
  handleSoilQuery,
  handleCropSuggestion,
  handleWeatherQuery,
  handleDiseaseQuery,
  handleFertilizerQuery,
  handleMarketQuery,
  handleGeneralQuery,
};
