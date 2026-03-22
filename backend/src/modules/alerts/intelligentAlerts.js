const { pool } = require("../../config/db");
const { callGroq } = require("../../utils/groqClient");
const { validateAndLog } = require("../../utils/alertValidator");
const { ALERT_TYPES, ALERT_PRIORITY_MAP } = require("../../utils/alertTypes");
const {
  CROP_KNOWLEDGE,
  getCropGrowthStage,
  getWeatherTriggeredDiseases,
  getWeatherTriggeredPests,
  getCurrentSeason
} = require("../../utils/cropKnowledge");
const { v4: uuidv4 } = require("uuid");
const { info, warn, error } = require("../../utils/logger");

// ─── PHONE NORMALIZATION ──────────────────────────────────────────────────────
// Converts phone numbers to E.164 format for Twilio/WhatsApp
// Examples: "9876543210" → "+919876543210", "+91 98765 43210" → "+919876543210"

function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 13 && trimmed.startsWith("+91")) return trimmed;
  
  return null; // Invalid format
}

// ─── MAIN FUNCTION ────────────────────────────────────────────────────────────
// Analyses a farmer and generates ALL relevant intelligent alerts
// Called by: score recalculation, manual trigger, API endpoints
// ✅ Alerts now send AUTOMATICALLY to WhatsApp when generated

async function generateIntelligentAlerts(farmerId, sendWhatsApp = true) {
  // 1. Get complete farmer profile
  const farmer = await getFullFarmerProfile(farmerId);
  if (!farmer) throw new Error(`Farmer not found: ${farmerId}`);

  // 2. Get live weather for farmer's district
  let weather = null;
  try {
    const weatherService = require("../weather/weather.service");
    weather = await weatherService.getWeatherByDistrictName(farmer.district);
  } catch (e) {
    warn(`Weather fetch failed for ${farmer.district}`, { message: e.message });
  }

  // 3. Analyse all conditions and decide which alerts to generate
  const alertsToGenerate = await analyseAllConditions(farmer, weather);

  // 4. Generate each alert via Groq
  const generatedAlerts = [];
  for (const alertConfig of alertsToGenerate) {
    try {
      if (!alertConfig) {
        error(`Alert config is undefined in alertsToGenerate array`);
        continue;
      }
      if (!alertConfig.type) {
        error(`Alert config missing 'type' property`, { config: JSON.stringify(alertConfig) });
        continue;
      }
      const alert = await generateSingleIntelligentAlert(farmer, weather, alertConfig, sendWhatsApp);
      if (alert) generatedAlerts.push(alert);
      await delay(500); // rate limit Groq
    } catch (err) {
      error(`Alert generation failed for type ${alertConfig?.type || 'UNKNOWN'}`, { message: err.message, stack: err.stack });
    }
  }

  return generatedAlerts;
}

// ─── CONDITION ANALYSER ───────────────────────────────────────────────────────
// Looks at ALL farmer data + weather and returns list of alerts to generate
// Each alert has: type, priority, urgency, specific context data

async function analyseAllConditions(farmer, weather) {
  const alerts = [];
  const crop = farmer.primary_crop?.toLowerCase();
  const cropInfo = CROP_KNOWLEDGE[crop];
  const month = new Date().getMonth() + 1;
  const season = getCurrentSeason();

  if (!weather) {
    warn("No weather data available for alert analysis", { farmerId: farmer.id });
    return alerts;
  }

  // Extract weather metrics
  const dailyData = weather.forecast_json?.daily || {};
  const temp = dailyData.temperature_2m_max?.[0] || 28;
  const humidity = dailyData.relative_humidity_2m_max?.[0] || 65;
  const rainfall7d = (dailyData.precipitation_sum || []).slice(0, 7).reduce((a, b) => a + (b || 0), 0);
  const rainfall14d = (dailyData.precipitation_sum || []).slice(0, 14).reduce((a, b) => a + (b || 0), 0);
  const windspeed = dailyData.windspeed_10m_max?.[0] || 10;

  // ── 1. CROP DISEASE RISK ────────────────────────────────────────────────────
  if (crop && cropInfo) {
    const diseasesAtRisk = getWeatherTriggeredDiseases(crop, temp, humidity, rainfall7d);

    if (diseasesAtRisk.length > 0) {
      alerts.push({
        type: ALERT_TYPES.CROP_DISEASE_RISK,
        priority: diseasesAtRisk[0].riskScore >= 80 ? "urgent" : "high",
        context: {
          diseases: diseasesAtRisk.slice(0, 2),
          temperature: temp,
          humidity,
          rainfall7d,
          season
        }
      });
    }
  }

  // ── 2. PEST OUTBREAK RISK ───────────────────────────────────────────────────
  if (crop && cropInfo) {
    const pestsAtRisk = getWeatherTriggeredPests(crop, temp, humidity, month);

    if (pestsAtRisk.length > 0) {
      alerts.push({
        type: ALERT_TYPES.PEST_OUTBREAK,
        priority: "high",
        context: {
          pests: pestsAtRisk,
          temperature: temp,
          humidity,
          season,
          month
        }
      });
    }
  }

  // ── 3. WEATHER EXTREME ──────────────────────────────────────────────────────
  const droughtRisk = weather.drought_risk_level;

  // Drought
  if (["high", "severe"].includes(droughtRisk) || rainfall14d < 10) {
    alerts.push({
      type: ALERT_TYPES.WEATHER_EXTREME,
      priority: "urgent",
      context: {
        extremeType: "drought",
        rainfall14d,
        droughtRisk,
        temperature: temp,
        crop,
        irrigationType: farmer.irrigation_type
      }
    });
  }

  // Flood/excess rain
  if (rainfall7d > 200) {
    alerts.push({
      type: ALERT_TYPES.WEATHER_EXTREME,
      priority: "urgent",
      context: {
        extremeType: "flood",
        rainfall7d,
        crop,
        soilType: farmer.soil_type
      }
    });
  }

  // Heatwave (temp > 42°C during crop growth)
  if (temp > 42 && crop) {
    alerts.push({
      type: ALERT_TYPES.WEATHER_EXTREME,
      priority: "urgent",
      context: {
        extremeType: "heatwave",
        temperature: temp,
        crop,
        irrigationType: farmer.irrigation_type
      }
    });
  }

  // ── 4. SOIL HEALTH ADVISORY ─────────────────────────────────────────────────
  const soilType = farmer.soil_type?.toLowerCase();

  if (crop && soilType && cropInfo) {
    const soilCompatibility = cropInfo.soil_requirements?.[soilType];
    const isPoSoil =
      soilCompatibility?.toLowerCase().includes("poor") ||
      soilCompatibility?.toLowerCase().includes("needs");

    if (isPoSoil) {
      alerts.push({
        type: ALERT_TYPES.SOIL_HEALTH,
        priority: "medium",
        context: {
          soilType,
          crop,
          soilAdvice: soilCompatibility,
          season
        }
      });
    }
  }

  // ── 5. IRRIGATION ADVISORY ──────────────────────────────────────────────────
  if (crop && cropInfo?.optimal_irrigation_days && farmer.sowing_date) {
    const das = Math.floor((new Date() - new Date(farmer.sowing_date)) / 86400000);
    const nextIrrigation = cropInfo.optimal_irrigation_days.find(
      (d) => d > das && d - das <= 7
    );

    if (nextIrrigation && droughtRisk !== "none") {
      alerts.push({
        type: ALERT_TYPES.IRRIGATION_ADVISORY,
        priority: "medium",
        context: {
          crop,
          das,
          nextIrrigationDas: nextIrrigation,
          daysUntilIrrigation: nextIrrigation - das,
          irrigationType: farmer.irrigation_type,
          rainfall7d
        }
      });
    }
  }

  // ── 6. FERTILIZER ADVISORY ──────────────────────────────────────────────────
  if (crop && cropInfo?.fertilizer_schedule && farmer.sowing_date) {
    const das = Math.floor((new Date() - new Date(farmer.sowing_date)) / 86400000);
    const upcomingFertilizer = cropInfo.fertilizer_schedule.find(
      (f) => f.das > das && f.das - das <= 10
    );

    if (upcomingFertilizer) {
      alerts.push({
        type: ALERT_TYPES.FERTILIZER_ADVISORY,
        priority: "medium",
        context: {
          crop,
          das,
          fertilizerDue: upcomingFertilizer,
          daysUntilDue: upcomingFertilizer.das - das,
          soilType: farmer.soil_type
        }
      });
    }
  }

  // ── 7. HARVEST ADVISORY ─────────────────────────────────────────────────────
  if (crop && cropInfo?.harvest_months?.includes(month) && farmer.sowing_date) {
    const das = Math.floor((new Date() - new Date(farmer.sowing_date)) / 86400000);
    const lastStage = cropInfo.growth_stages?.[cropInfo.growth_stages.length - 1];
    const maturityMin = lastStage ? parseInt(lastStage.days.split("-")[0]) : 120;

    if (das >= maturityMin - 10) {
      alerts.push({
        type: ALERT_TYPES.HARVEST_ADVISORY,
        priority: "high",
        context: {
          crop,
          das,
          daysToMaturity: Math.max(0, maturityMin - das),
          weatherForecast: rainfall7d > 50 ? "rain_expected" : "dry",
          droughtRisk
        }
      });
    }
  }

  // ── 8. VULNERABILITY SPIKE ──────────────────────────────────────────────────
  if (farmer.vulnerability_score >= 76) {
    const previousScore = await getPreviousScore(farmer.id);
    if (previousScore && farmer.vulnerability_score - previousScore >= 10) {
      alerts.push({
        type: ALERT_TYPES.VULNERABILITY_SPIKE,
        priority: "urgent",
        context: {
          currentScore: farmer.vulnerability_score,
          previousScore,
          scoreDelta: farmer.vulnerability_score - previousScore,
          label: farmer.vulnerability_label,
          topRisks: await getTopRiskFactors(farmer.id)
        }
      });
    }
  }

  // ── 9. SOWING ADVISORY (pre-season) ────────────────────────────────────────
  if (crop && cropInfo?.sowing_months) {
    const nextMonth = month === 12 ? 1 : month + 1;
    if (cropInfo.sowing_months.includes(nextMonth) && !farmer.sowing_date) {
      alerts.push({
        type: ALERT_TYPES.SOWING_ADVISORY,
        priority: "medium",
        context: {
          crop,
          optimalSowingMonths: cropInfo.sowing_months,
          soilType: farmer.soil_type,
          irrigationType: farmer.irrigation_type,
          season: cropInfo.season
        }
      });
    }
  }

  // Deduplicate — remove alert types already sent recently
  return await deduplicateAlerts(farmer.id, alerts);
}

// ─── SINGLE ALERT GENERATOR ───────────────────────────────────────────────────

async function generateSingleIntelligentAlert(farmer, weather, alertConfig, sendWhatsApp) {
  const lang = farmer.preferred_language || "gu";
  const langName = getLanguageName(lang);
  const instruction = buildIntelligentInstruction(alertConfig, farmer, weather);

  // Pass farmer to system prompt so it can enforce farmer-specific rules
  const systemPrompt = buildGroqSystemPrompt(langName, farmer);
  const userPrompt = buildGroqUserPrompt(farmer, alertConfig, instruction, langName);

  try {
    let rawResult = null;
    let validation = null;
    let retryCount = 0;
    const maxRetries = 1;

    // First attempt
    rawResult = await callGroq(systemPrompt, userPrompt, 1200);
    const parsed = parseAlertSections(rawResult);
    
    // CRITICAL: Validate response against banned phrases and generic content
    validation = validateAndLog(parsed.whatsappMessage, farmer, alertConfig.type);
    
    // If validation fails and we have retries left, add error feedback and retry once
    if (!validation.isValid && retryCount < maxRetries) {
      retryCount++;
      warn(
        `Alert validation FAILED (score: ${validation.score}). Retrying with stricter prompt...`,
        { farmerId: farmer.id, alertType: alertConfig.type, errors: validation.errors }
      );
      
      // Build stricter retry prompt with error feedback
      const stricter_userPrompt = userPrompt + `

═══════════════════════════════════════════════════════════════════════════════
⚠️ CRITICAL RETRY INSTRUCTION — YOUR PREVIOUS RESPONSE WAS REJECTED ⚠️
═══════════════════════════════════════════════════════════════════════════════
Your last response FAILED validation. Errors found:
${validation.errors.map((e) => `  ✗ ${e}`).join("\n")}

You MUST fix these errors in your retry:
- You MUST use "${farmer.name}" in the WhatsApp message (use his name, not generic)
- You MUST mention his crop "${farmer.primary_crop}" and district "${farmer.district}"
- You MUST include at least one specific number from context (temperature, humidity, ₹, days)
- You MUST use specific timing with hours/days (e.g., "tomorrow 6AM"), NEVER "as soon as possible"
- You MUST NOT use ANY of these banned phrases: ખેડૂત મિત્રો, visit your nearest, in general, it is important

If you write even ONE sentence that could apply to a different farmer, your response FAILS.
Test yourself: Could farmer "Kumar" in "Vadodara" receive this exact message?
If YES → rewrite immediately.

Now REWRITE focusing on fixing ONLY the errors listed above.
═══════════════════════════════════════════════════════════════════════════════
`;

      // Retry with stricter prompt
      rawResult = await callGroq(systemPrompt, stricter_userPrompt, 1200);
      const retryParsed = parseAlertSections(rawResult);
      
      // Validate retry
      validation = validateAndLog(retryParsed.whatsappMessage, farmer, alertConfig.type);
      
      if (validation.isValid || validation.score >= 50) {
        // Retry succeeded
        info(`Retry successful! New validation score: ${validation.score}`, {
          farmerId: farmer.id,
          alertType: alertConfig.type
        });
        Object.assign(parsed, retryParsed);
      } else {
        // Retry still failed but use best attempt
        warn(
          `Retry still failed (score: ${validation.score}), using best attempt anyway`,
          { farmerId: farmer.id, alertType: alertConfig.type, errors: validation.errors }
        );
      }
    }

    // Save to DB with validation score
    const savedAlert = await saveAlert({
      farmerId: farmer.id,
      organizationId: farmer.organization_id,
      alertType: alertConfig.type,
      priority: alertConfig.priority || ALERT_PRIORITY_MAP[alertConfig.type],
      language: lang,
      messageText: parsed.whatsappMessage,
      voiceNoteScript: parsed.voiceNoteScript,
      reason: parsed.reason,
      validationScore: validation ? validation.score : 50
    });

    // Send WhatsApp immediately when requested
    // Validation score is tracked in DB for dashboard monitoring but doesn't block sending
    if (sendWhatsApp && farmer.phone) {
      try {
        const whatsappService = require("../whatsapp/whatsapp.service");
        
        // Normalize phone to E.164 format (+91XXXXXXXXXX)
        const normalizedPhone = normalizePhoneNumber(farmer.phone);
        if (!normalizedPhone) throw new Error(`Invalid phone number: ${farmer.phone}`);
        
        await whatsappService.sendMessage(normalizedPhone, parsed.whatsappMessage);
        await pool.query(`UPDATE alerts SET status = 'sent', sent_at = NOW() WHERE id = $1`, [
          savedAlert.id
        ]);
        
        // Log with quality indicator
        const qualityNote = validation?.score >= 50 ? "good quality" : `lower quality (score: ${validation?.score || 50}/100)`;
        info(`WhatsApp sent to farmer`, {
          farmerId: farmer.id,
          alertId: savedAlert.id,
          phoneNumber: normalizedPhone,
          alertType: alertConfig.type,
          quality: qualityNote
        });
      } catch (err) {
        warn(`WhatsApp delivery failed for farmer ${farmer.id}`, {
          farmerId: farmer.id,
          alertId: savedAlert.id,
          phone: farmer.phone,
          message: err.message
        });
        // Alert saved in DB as 'pending' — officer can retry via dashboard
      }
    }

    return savedAlert;
  } catch (err) {
    error(`Failed to generate alert for farmer ${farmer.id}`, { message: err.message });
    throw err;
  }
}

// ─── GROQ SYSTEM PROMPT ───────────────────────────────────────────────────────

function buildGroqSystemPrompt(langName, farmer) {
  const farmerFirstName = farmer?.name?.split(" ")[0] || "farmer";
  const farmerVillage = farmer?.village || "";
  const farmerDistrict = farmer?.district || "";
  const farmerCrop = farmer?.primary_crop || "";
  
  return `You are KhedutMitra, a trusted agricultural advisor for rural farmers 
in Gujarat, India. You work with Anand Cooperative Bank to help farmers protect 
their crops and income.

═══════════════════════════════════════════════════════════════════════════════
6 ABSOLUTE RULES — YOUR RESPONSE FAILS IF YOU BREAK ANY OF THESE
═══════════════════════════════════════════════════════════════════════════════

RULE 1: ZERO GENERIC TEXT
- Every. Single. Sentence. Must use ACTUAL DATA from farmer profile.
- Do NOT write any sentence that could apply to a different farmer.
- Self-test BEFORE output: Could this message be sent to farmer named "Kumar"? 
  If YES, it's WRONG — rewrite to include SPECIFIC farmer data.
- Example WRONG: "Farmers should irrigate their crops regularly" (applies to anyone)
- Example RIGHT: "Your wheat in ${farmerVillage} needs water TODAY because temp is 38°C"

RULE 2: BANNED PHRASES — NEVER USE THESE
Absolutely forbidden (will be auto-rejected if found):
- "ખેડૂત મિત્રો" (addressing generic farmers)
- "તમારું ખેતી" (generic farming address)
- "આવશ્યક છે" (it is important — generic English translation)
- "visit your nearest" / "contact your local"
- "in general" / "typically" / "farming practices"
- "it is recommended" / "we suggest" / "you should"
- "સામાન્ય રીતે" (generally in Gujarati)
- "જ્યાં સુધી" (vague timing)
- "શક્ય તે બધું" (do everything possible — vague)
- "કૃષિ સલાહ આપીને" (offering agriculture advice — too formal)
- "આપણો" (our/we — formal)
- "desh me" / "hamara" (our/country — too formal)
- "Kisan" if not with specific context — use "aap" (you)
- Any phrase from government agricultural handbook — farmers distrust that tone

RULE 3: MANDATORY DATA POINTS
EVERY alert MUST contain ALL of these:
1. Farmer's FIRST NAME used at least 2 times in the message
2. Crop name in BOTH English AND Gujarati: "${farmerCrop} (${CROP_KNOWLEDGE[farmerCrop?.toLowerCase()]?.gujarati_name || farmerCrop})"
3. District name EXPLICITLY: "${farmerDistrict}"
4. At least ONE specific number from context: temperature, humidity, ₹ amount, kg, liters, days, DAS, etc.
5. Product name + EXACT dose (not "as needed" but actual quantity: "500ml/acre" or "20g per 10L water")
6. Specific timing with hours/days: "tomorrow 6AM" NOT "as soon as possible" or "soon as weather permits"
7. Consequence stated clearly if ignored: "loss estimate", "disease spread", "harvest loss", etc.

RULE 4: LANGUAGE — SIMPLE NOT FORMAL
- Write ONLY in ${langName}
- If ${langName} is Gujarati: use SIMPLE everyday Gujarati, NOT formal/archaic
  Example good: "તમારા ઘઉ ને આ રોગ થઈ શકે" (simple, direct)
  Example bad: "ભવદીય ઘઉ ને રોગ ઉત્પન્ન થઈ શકે" (formal, archaic)
- Use local terms farmers actually say in their village
- Numbers and ₹ amounts: always use figures (₹680 not six hundred eighty)
- Pesticide/fertilizer names: keep in English (Endosulfan, Chlorpyriphos, Urea) — farmers know them this way
- Brand names okay if commonly known in Gujarat

RULE 5: FORMAT RULES
- Plain text ONLY. Zero markdown. Zero asterisks (*). Zero hash (#). Zero bold.
- Numbered lists: "1." on new line — NO bullets or dashes
- Use 3-5 emojis NATURALLY (not emoji spam)
- Maximum 850 characters for WhatsApp (count every character)
- Warm friend-to-friend tone — like a smart farmer neighbor giving advice
- NEVER government/official tone — farmers think that's scam
- ALWAYS end with action for TODAY — not "whenever possible"
- Structure: [problem] → [why now] → [action with time] → [cost/benefit] → [contact]

RULE 6: SELF-TEST BEFORE OUTPUT
Before you output, answer these in your head (DON'T write answers):
- ✓ Does message contain "${farmerFirstName}"? If NO = rewrite
- ✓ Does message mention ${farmerCrop}? If NO = rewrite
- ✓ Does message have at least one number (₹/°C/kg/days)? If NO = rewrite
- ✓ Does message have specific action with time? If NO = rewrite
- ✓ Could this message work for a different farmer? If YES = rewrite
- ✓ Did I use any banned phrases? If YES = rewrite

If you fail this self-test, your response FAILS and receives automatic ZERO score.
═══════════════════════════════════════════════════════════════════════════════

LANGUAGE RULES:
- Write ONLY in ${langName}
- If ${langName} is Gujarati: use simple everyday Gujarati words, NOT formal/archaic Gujarati
- Use local terms farmers actually use in their village
- Numbers and ₹ amounts always in figures (₹680, not words)
- Pesticide/fertilizer names stay in English as farmers know them that way
- Brand names are okay if commonly known

FORMAT RULES:
- Plain text ONLY. Zero markdown. Zero asterisks (*). Zero hash (#).
- Use numbered lists: write "1." on a new line — NOT bullets
- Use emojis naturally — 3 to 5 maximum per message
- Maximum 850 characters for WhatsApp message
- Warm, friend-to-friend tone. Like a smart farmer neighbor giving advice.
- NEVER use government/official language. Farmers distrust that tone.
- Always end with what to do TODAY — not "whenever possible"`;
}

// ─── GROQ USER PROMPT ─────────────────────────────────────────────────────────

function buildGroqUserPrompt(farmer, alertConfig, instruction, langName) {
  const cropKn = CROP_KNOWLEDGE[farmer.primary_crop?.toLowerCase()];
  const cropGujarati = cropKn?.gujarati_name || farmer.primary_crop;
  const farmerFirstName = farmer.name?.split(" ")[0] || farmer.name;
  
  // Pre-calculate values that model MUST use in alert
  const daysOverdue = farmer.loan_due_date 
    ? Math.ceil((new Date(farmer.loan_due_date) - new Date()) / 86400000)
    : null;
  const daysUntilInsurance = farmer.insurance_expiry_date
    ? Math.ceil((new Date(farmer.insurance_expiry_date) - new Date()) / 86400000)
    : null;

  return `
══════════════════════════════════════════════════════════════════════════════
FARMER: ${farmer.name} | ID: ${farmer.id} | Village: ${farmer.village}, District: ${farmer.district}
══════════════════════════════════════════════════════════════════════════════

FARMER PROFILE (USE THIS DATA IN EVERY SENTENCE):
Name: ${farmer.name}
First Name: ${farmerFirstName}
Village: ${farmer.village}, Taluka: ${farmer.taluka}, District: ${farmer.district}
Primary Crop: ${farmer.primary_crop} (${cropGujarati})
Secondary Crop: ${farmer.secondary_crop || "None"}
Land: ${farmer.land_area_acres} acres
Soil Type: ${farmer.soil_type}
Irrigation: ${farmer.irrigation_type}
Vulnerability Score: ${farmer.vulnerability_score}/100 (${farmer.vulnerability_label})
Annual Income: ₹${farmer.annual_income_inr?.toLocaleString("en-IN") || "Not recorded"}
${daysOverdue !== null ? `Days Until Loan Due: ${daysOverdue} days` : ""}
${daysUntilInsurance !== null ? `Days Until Insurance Expires: ${daysUntilInsurance} days` : ""}
Insurance: ${farmer.has_crop_insurance ? "YES - PMFBY enrolled" : "NO"}
PM-Kisan: ${farmer.pm_kisan_enrolled ? "YES" : "NO"}
Phone: ${farmer.phone}
Preferred Language: ${langName}

ALERT TYPE: ${alertConfig.type}

SPECIFIC CONTEXT AND INSTRUCTIONS:
${instruction}

═══════════════════════════════════════════════════════════════════════════════
GENERATE THREE SECTIONS (EXACTLY THIS ORDER):
═══════════════════════════════════════════════════════════════════════════════

---WHATSAPP_MESSAGE---
(max 850 characters for WhatsApp)
Requirements:
1. Line 1: Start with emoji + alert type + farmer's FIRST NAME "${farmerFirstName}"
2. Specific situation ONLY for ${farmer.name} growing ${farmer.primary_crop} in ${farmer.district}
3. Use crop name in both languages: "${farmer.primary_crop}" (${cropGujarati})
4. Include specific number: temperature, humidity, ₹, kg, liters, days — from context
5. Farming action with EXACT time: "tomorrow 6AM" NOT "soon"
6. Cost in ₹ if applicable (treatment cost per acre, or benefit amount)
7. Consequence if ignored: specific risk with numbers
8. Contact line at end: "Reply 1 - info | 6 - officer | 0 - menu"
9. NO banned phrases, NO generic text
10. Warm tone like village neighbor, not government

---VOICE_NOTE_SCRIPT---
(max 100 words, write as if being SPOKEN ALOUD, pauses marked with ...)
1. Greeting: "Kem cho ${farmerFirstName}bhai..." (if male) or "Kem chho ${farmerFirstName}ben..." (if female)
2. Most critical single action for TODAY
3. Why it matters RIGHT NOW
4. End warmly: "take care" / "khyal rakjo"

---REASON---
(1 line English only — internal tracking/logging)
Format: "Alert type — key context metric, temp, location"
Example: "Pink bollworm risk — temp 34°C, humidity 58%, cotton DAS 45"

═══════════════════════════════════════════════════════════════════════════════
FINAL SELF-CHECK BEFORE OUTPUT (you must pass ALL checks):
═══════════════════════════════════════════════════════════════════════════════
☑️ Does your WhatsApp message contain "${farmerFirstName}" or "${farmer.name}"? 
   If NO → FAIL: rewrite to include farmer name
   If YES → continue to next check

☑️ Does your message mention the crop "${farmer.primary_crop}"? 
   If NO → FAIL: rewrite to include crop name
   If YES → continue

☑️ Does your message mention "${farmer.district}" district? 
   If NO → FAIL: rewrite to include district
   If YES → continue

☑️ Does your message contain at least ONE specific number?
   (temperature °C, humidity %, rainfall mm, ₹ amount, dose/kg, days, hours)
   If NO → FAIL: rewrite with numbers from context
   If YES → continue

☑️ Does your message include ACTION with SPECIFIC TIME?
   ("tomorrow 6AM", "today by 5PM", "within 3 days" with date)
   NOT "as soon as possible" or "when you can"
   If NO → FAIL: rewrite with specific timing
   If YES → continue

☑️ Could this exact message be sent to a DIFFERENT farmer named "Kumar" growing "sugarcane" in "Vadodara"?
   If YES → FAIL: too generic, rewrite to be specific to ${farmer.name}
   If NO → continue to output

If you FAILED any check, STOP and rewrite the message BEFORE outputting.
═══════════════════════════════════════════════════════════════════════════════
`;
}

// ─── ALERT-SPECIFIC INSTRUCTIONS ─────────────────────────────────────────────

function buildIntelligentInstruction(alertConfig, farmer, weather) {
  const { type, context } = alertConfig;
  const crop = farmer.primary_crop;
  const cropKn = CROP_KNOWLEDGE[crop?.toLowerCase()];
  const cropGujarati = cropKn?.gujarati_name || crop;

  // Ensure arrays are defined (might be missing context for some alert types)
  const diseasesFormatted = (context?.diseases || [])
    .map(
      (d, i) => `
Disease ${i + 1}: ${d.name} (${d.gujarati})
  Symptoms: ${d.symptoms}
  Treatment: ${d.treatment}
  Prevention: ${d.prevention}
  Risk score: ${d.riskScore}/100
`
    )
    .join("");

  const pestsFormatted = (context?.pests || [])
    .map(
      (p) => `
Pest: ${p.name}
  Treatment: ${p.treatment}
  Threshold: ${p.economic_threshold || "visible damage = spray"}
`
    )
    .join("");

  const instructions = {
    [ALERT_TYPES.CROP_DISEASE_RISK]: `
SITUATION: Weather conditions are creating HIGH risk of crop disease.
Crop: ${crop} (${cropGujarati})
Current temperature: ${context.temperature}°C
Current humidity: ${context.humidity}%  
Rainfall last 7 days: ${context.rainfall7d}mm

AT-RISK DISEASES (most dangerous first):
${diseasesFormatted}

MUST INCLUDE IN ALERT:
- Disease name in Gujarati + what it looks like on the plant
- Why current weather (temp ${context.temperature}°C, humidity ${context.humidity}%) creates this exact risk for ${crop}
- How to CHECK if disease has started (what to look for in field TODAY)
- Treatment: exact product name + dose + how to apply
- Prevention: 1-2 immediate actions
- Cost estimate for treatment (approximate ₹ per acre)
- When to spray (morning/evening, before/after rain)
- If disease already present: action is URGENT, same day
- If preventive: can wait 2-3 days but not more`,

    [ALERT_TYPES.PEST_OUTBREAK]: `
SITUATION: Season and weather conditions indicate HIGH pest risk.
Crop: ${crop} (${cropGujarati})
Month: ${new Date().toLocaleString("en-IN", { month: "long" })}
Temperature: ${context.temperature}°C
Humidity: ${context.humidity}%

AT-RISK PESTS:
${pestsFormatted}

MUST INCLUDE:
- Pest name
- How to identify it in the field (visible signs)
- Economic threshold — when exactly to spray (not before, not after)
- Treatment: exact product + dose + water quantity per acre
- Best time to spray (morning/evening)
- Cost per acre approximately
- Natural/organic alternative if available
- What happens if ignored (crop loss % estimate)`,

    [ALERT_TYPES.WEATHER_EXTREME]: `
SITUATION: ${context.extremeType?.toUpperCase()} alert for ${farmer.district} district.
${
  context.extremeType === "drought"
    ? `
Rainfall last 14 days: ${context.rainfall14d}mm (very low)
Drought risk level: ${context.droughtRisk}
Temperature: ${context.temperature}°C
Crop: ${crop}
Irrigation type: ${context.irrigationType}
`
    : ""
}
${
  context.extremeType === "flood"
    ? `
Rainfall last 7 days: ${context.rainfall7d}mm (excess)
Crop: ${crop}
Soil type: ${context.soilType}
`
    : ""
}
${
  context.extremeType === "heatwave"
    ? `
Temperature: ${context.temperature}°C (dangerous)
Crop: ${crop}
Irrigation: ${context.irrigationType}
`
    : ""
}

MUST INCLUDE:
${
  context.extremeType === "drought"
    ? `
- How many days without adequate rain
- Immediate irrigation advice for ${crop} with ${context.irrigationType}
- Water saving techniques specific to ${context.irrigationType}
- Signs of drought stress in ${crop} to watch for
- If crop insurance (PMFBY): how to document drought damage
- NABARD drought loan availability
- Government drought relief: how to apply, who to contact
- Tehsildar office role — report within 72 hours of damage`
    : ""
}
${
  context.extremeType === "flood"
    ? `
- Drainage advice specific to ${context.soilType} soil
- How to save ${crop} from waterlogging
- Fungal disease risk after flooding (which ones)
- Signs of root damage to watch for
- Insurance claim process: photograph damage, contact patwari`
    : ""
}
${
  context.extremeType === "heatwave"
    ? `
- Irrigation frequency increase needed
- Mulching to reduce soil temperature
- Shade net use if applicable for ${crop}
- Heat stress signs in ${crop}
- Best time to irrigate in heatwave (early morning only)`
    : ""
}`,

    [ALERT_TYPES.SOIL_HEALTH]: `
SITUATION: Soil type and crop combination needs attention.
Soil type: ${context.soilType}
Crop: ${crop} (${cropGujarati})
Compatibility note: ${context.soilAdvice}
Season: ${context.season}

MUST INCLUDE:
- Why this soil + this crop combination has a specific challenge
- What EXACTLY to add to improve compatibility:
  * Organic matter: quantity + how to apply
  * Specific nutrient if deficient
  * pH correction if needed
- Soil testing: Soil Health Card scheme (free from govt)
- Specific amendment: product name + dose + cost per acre
- When to apply (before sowing / after sowing)
- Expected improvement in yield if followed
- How to get free soil test from government`,

    [ALERT_TYPES.IRRIGATION_ADVISORY]: `
SITUATION: Critical irrigation timing for ${crop}.
Days after sowing: ${context.das} days
Next critical irrigation due: at ${context.nextIrrigationDas} DAS 
(in ${context.daysUntilIrrigation} days)
Irrigation type available: ${context.irrigationType}
Rainfall last 7 days: ${context.rainfall7d}mm

MUST INCLUDE:
- Why this specific irrigation timing is critical for ${crop} (which growth stage, what happens if skipped)
- Exact amount of water needed (litres per acre OR hours of irrigation)
- If ${context.irrigationType} is drip: schedule in hours
- If flood irrigation: how many hours / how deep water level
- Signs of water stress to watch for in next 3 days
- If rain is expected: should they skip or do half irrigation?
- Water quality note if relevant (salinity risk in Gujarat)`,

    [ALERT_TYPES.FERTILIZER_ADVISORY]: `
SITUATION: Upcoming fertilizer application for ${crop}.
Days after sowing: ${context.das} days
Fertilizer due in: ${context.daysUntilDue} days
Recommended: ${context.fertilizerDue?.type || "fertilizer"} — ${context.fertilizerDue?.dose || "as per recommendation"}
Soil type: ${context.soilType}

MUST INCLUDE:
- Which fertilizer + exact quantity per acre
- Why this timing is important (crop stage + what nutrient does now)
- How to apply: broadcast / band / foliar spray
- Cost estimate per acre in ₹
- What NOT to mix with this fertilizer
- Signs of deficiency if farmer missed previous dose
- Morning or evening application
- Rain consideration: apply before or after rain?
- Purchase: available at which type of shop (cooperative/agro center)`,

    [ALERT_TYPES.HARVEST_ADVISORY]: `
SITUATION: ${crop} approaching harvest time.
Days after sowing: ${context.das} days
Days to maturity estimate: ${context.daysToMaturity}
Weather next 7 days: ${
      context.weatherForecast === "rain_expected"
        ? "RAIN EXPECTED — harvest urgency high"
        : "Dry — good harvest conditions"
    }

MUST INCLUDE:
- Signs that crop is READY to harvest (specific visual indicators for ${crop})
- Signs that crop needs MORE time (not ready yet)
- Optimal harvest time: morning/afternoon/time of day
- Harvesting method: manual or machine? cost of harvester per acre
- Storage: how to dry to correct moisture % before storage
- Moisture content target: % for safe storage of ${crop}
- Market timing: current approximate price range ₹ per quintal
- ${
      context.weatherForecast === "rain_expected"
        ? "URGENT: Rain expected — harvest within X days or risk quality loss"
        : "Good weather window — plan harvest within next 2 weeks"
    }`,

    [ALERT_TYPES.VULNERABILITY_SPIKE]: `
SITUATION: Vulnerability score jumped significantly.
Previous score: ${context.previousScore}/100
Current score: ${context.currentScore}/100
Change: +${context.scoreDelta} points
Current label: ${context.label?.toUpperCase()}
Top risk factors: ${context.topRisks}

MUST INCLUDE:
- Score number clearly stated — farmer understands it as risk level
- Top 3 reasons score increased (in simple Gujarati)
- Most urgent single action to take THIS WEEK
- What the bank can help with right now
- Reassurance: score can improve with action. Mention examples.
- Steps to improve score (3 most impactful ones)
- Contact officer for personalized plan
- Helpline or officer contact`,

    [ALERT_TYPES.SOWING_ADVISORY]: `
SITUATION: Upcoming sowing season for ${crop}.
Optimal sowing months: ${context.optimalSowingMonths?.join(", ")}
Soil type: ${context.soilType}
Irrigation: ${context.irrigationType}

MUST INCLUDE:
- When exactly to sow: date range for ${farmer.district} district
- Why this timing matters (temperature + monsoon pattern for Gujarat)
- Seed selection: best varieties for ${context.soilType} soil in Gujarat
- Seed rate per acre
- Seed treatment: product + method (most important for first-time growers)
- Pre-sowing soil preparation specific to ${context.soilType}
- Initial fertilizer at sowing
- Government seeds available: cooperative society or agro center
- Cost estimate for seeds + treatment per acre`
  };

  return (
    instructions[type] ||
    `Generate a helpful agricultural advisory for farmer ${farmer.name} growing ${crop} in ${farmer.district} district. Context: ${JSON.stringify(context)}`
  );
}

// ─── DEDUPLICATION ────────────────────────────────────────────────────────────

async function deduplicateAlerts(farmerId, alertsToGenerate) {
  const dedupWindows = {
    [ALERT_TYPES.CROP_DISEASE_RISK]: "3 days",
    [ALERT_TYPES.PEST_OUTBREAK]: "3 days",
    [ALERT_TYPES.WEATHER_EXTREME]: "1 day",
    [ALERT_TYPES.SOIL_HEALTH]: "30 days",
    [ALERT_TYPES.IRRIGATION_ADVISORY]: "5 days",
    [ALERT_TYPES.FERTILIZER_ADVISORY]: "7 days",
    [ALERT_TYPES.HARVEST_ADVISORY]: "5 days",
    [ALERT_TYPES.VULNERABILITY_SPIKE]: "3 days",
    [ALERT_TYPES.SOWING_ADVISORY]: "14 days"
  };

  const filtered = [];
  for (const alert of alertsToGenerate) {
    const window = dedupWindows[alert.type] || "7 days";
    const recent = await pool.query(
      `SELECT id FROM alerts 
       WHERE farmer_id = $1 AND alert_type = $2 
       AND created_at > NOW() - INTERVAL '${window}'`,
      [farmerId, alert.type]
    );
    if (recent.rows.length === 0) filtered.push(alert);
  }
  return filtered;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function getFullFarmerProfile(farmerId) {
  try {
    const r = await pool.query(
      `SELECT f.*, o.id as organization_id, o.name as org_name
       FROM farmers f 
       LEFT JOIN organizations o ON o.id = f.organization_id
       WHERE f.id = $1`,
      [farmerId]
    );
    return r.rows[0] || null;
  } catch (err) {
    // Fallback: organizations table might not exist, just get farmer data
    if (err.message.includes('organizations')) {
      const r = await pool.query(
        `SELECT f.*, f.id as organization_id
         FROM farmers f 
         WHERE f.id = $1`,
        [farmerId]
      );
      return r.rows[0] || null;
    }
    throw err;
  }
}

async function getPreviousScore(farmerId) {
  const r = await pool.query(
    `SELECT vulnerability_score as score FROM farmers
     WHERE id = (
       SELECT DISTINCT farmer_id FROM vulnerability_score_history
       WHERE farmer_id = $1 ORDER BY calculated_at DESC LIMIT 1 OFFSET 1
     )`,
    [farmerId]
  );
  return r.rows[0]?.score || null;
}

async function getTopRiskFactors(farmerId) {
  const r = await pool.query(
    `SELECT score_breakdown FROM vulnerability_score_history
     WHERE farmer_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
    [farmerId]
  );
  if (!r.rows[0]?.score_breakdown) return "multiple factors";
  const b = r.rows[0].score_breakdown;
  return Object.entries(b)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k, v]) => `${k}(${v}pts)`)
    .join(", ");
}

async function saveAlert({
  farmerId,
  organizationId,
  alertType,
  priority,
  language,
  messageText,
  voiceNoteScript,
  reason,
  validationScore = 100
}) {
  const r = await pool.query(
    `INSERT INTO alerts (id, farmer_id, organization_id, alert_type, priority,
      language, message_text, voice_note_script, reason, status, ai_generated, validation_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',true,$10) RETURNING *`,
    [
      uuidv4(),
      farmerId,
      organizationId,
      alertType,
      priority,
      language,
      messageText,
      voiceNoteScript,
      reason,
      validationScore
    ]
  );
  return r.rows[0];
}

function parseAlertSections(rawText) {
  const wa = rawText.match(/---WHATSAPP_MESSAGE---\s*([\s\S]*?)(?=---VOICE_NOTE_SCRIPT---|$)/);
  const vn = rawText.match(/---VOICE_NOTE_SCRIPT---\s*([\s\S]*?)(?=---REASON---|$)/);
  const re = rawText.match(/---REASON---\s*([\s\S]*)$/);
  return {
    whatsappMessage: wa ? wa[1].trim() : rawText.trim(),
    voiceNoteScript: vn ? vn[1].trim() : "",
    reason: re ? re[1].trim() : ""
  };
}

function getLanguageName(code) {
  return { gu: "Gujarati", hi: "Hindi", en: "English", hinglish: "Hinglish" }[code] || "Gujarati";
}

function formatDate(date) {
  if (!date || date === "N/A") return "N/A";
  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "N/A";
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { generateIntelligentAlerts };
