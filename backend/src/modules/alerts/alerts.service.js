const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");
const whatsappService = require("../whatsapp/whatsapp.service");
const logger = require("../../utils/logger");
const { callGrok } = require("../../utils/grokClient");

async function listAlerts(filters = {}) {
  const { farmer_id, priority, status, limit = 50 } = filters;
  const where = [];
  const values = [];

  if (farmer_id) {
    values.push(farmer_id);
    where.push(`a.farmer_id = $${values.length}`);
  }
  if (priority) {
    values.push(String(priority).toUpperCase());
    where.push(`a.risk_level = $${values.length}`);
  }
  if (status) {
    values.push(status);
    where.push(`a.status = $${values.length}`);
  }

  values.push(Number(limit) > 0 ? Number(limit) : 50);
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const sql = `
    SELECT a.*, f.name AS farmer_name
    FROM alerts a
    LEFT JOIN farmers f ON f.id = a.farmer_id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT $${values.length}
  `;
  const { rows } = await pool.query(sql, values);
  return { alerts: rows };
}

async function createAlert(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO alerts (id, farmer_id, crop_id, message, reason, risk_level)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [id, payload.farmer_id, payload.crop_id, payload.message, payload.reason, payload.risk_level];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function generateAlertsForFarmer(user, farmerId, ip) {
  const farmerRes = await pool.query(
    `SELECT * FROM farmers WHERE id = $1`,
    [farmerId]
  );
  if (farmerRes.rowCount === 0) throw new AppError("Farmer not found", 404);
  const farmer = farmerRes.rows[0];

  const [recentAlertsRes, latestScoreRes, weatherRes] = await Promise.all([
    pool.query(
      `SELECT message, reason, risk_level, created_at
       FROM alerts
       WHERE farmer_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [farmerId]
    ),
    pool.query(
      `SELECT score
       FROM fvi_records
       WHERE farmer_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [farmerId]
    ),
    pool.query(
      `SELECT temperature, rainfall, humidity, fetched_at
       FROM weather_cache
       WHERE district = $1 OR location = $1
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [farmer.district]
    )
  ]);

  const currentMonth = new Date().toLocaleString("en-IN", { month: "long" });
  const season = ["June", "July", "August", "September"].includes(currentMonth)
    ? "Kharif"
    : ["October", "November", "December", "January", "February", "March"].includes(currentMonth)
      ? "Rabi"
      : "Summer";

  const latestScore = latestScoreRes.rows[0]?.score ?? null;
  const weather = weatherRes.rows[0] || null;
  const rainfall = weather?.rainfall != null ? Number(weather.rainfall) : null;
  const temperature = weather?.temperature != null ? Number(weather.temperature) : null;
  const humidity = weather?.humidity != null ? Number(weather.humidity) : null;
  const recentAlerts = recentAlertsRes.rows;
  const recentAlertsSummary = recentAlerts.length
    ? recentAlerts.map((a, idx) => `${idx + 1}. ${a.message} (${a.risk_level})`).join("\n")
    : "None";

  const fallbackDynamic = buildRuleBasedAlert({
    farmer,
    currentMonth,
    season,
    latestScore,
    recentAlerts,
    weather
  });
  
  // Generate dynamic alert using Grok
  let alertMessage = fallbackDynamic.message;
  let alertReason = fallbackDynamic.reason;
  let riskLevel = fallbackDynamic.risk_level;
  
  try {
    // Build context from farmer and historical parameters
    const context = `
Farmer: ${farmer.name}
Location: ${farmer.district}, ${farmer.village}
Crop: ${farmer.primary_crop}
Land Area: ${farmer.land_size} acres
Irrigation: ${farmer.irrigation_type || 'Unknown'}
Soil Type: ${farmer.soil_type}
Insurance: ${farmer.has_crop_insurance ? 'Yes' : 'No'}
Income: ₹${farmer.annual_income || 'N/A'}
Rainfall (latest): ${rainfall ?? 'N/A'} mm
Temperature (latest): ${temperature ?? 'N/A'} C
Humidity (latest): ${humidity ?? 'N/A'}%
Current Month: ${currentMonth}
Season: ${season}
Latest Vulnerability Score: ${latestScore ?? 'N/A'}
Recent Alerts:\n${recentAlertsSummary}`;
    
    const systemPrompt = `You are an agricultural risk advisor for Indian farmers.
Generate ONE fresh alert that should NOT repeat previous alerts.
Use crop, district, season, income, land size, soil, latest weather (rainfall, temperature, humidity) and latest vulnerability score.
Return only valid JSON with keys: message, reason, risk_level.
Rules:
  - message: max 120 chars, actionable and specific, must be in Gujarati script
  - reason: short, factual trigger behind the alert, must be in Gujarati script
- risk_level: one of LOW, MEDIUM, HIGH, CRITICAL
- avoid generic repeated text like 'Potential moisture stress detected' unless strongly justified`;
    
    const userPrompt = `Generate an alert for this farmer based on their data:${context}

  Consider seasonal crop risk, location stress and historical alerts. Ensure this alert is meaningfully different from recent ones.
  Language requirement: Gujarati only for message and reason.`;
    
    const grokResponse = await callGrok(systemPrompt, userPrompt, 300);
    
    if (grokResponse) {
      // Parse JSON first, then fallback to regex, then fallback to raw text.
      try {
        const parsed = JSON.parse(grokResponse);
        if (parsed?.message) alertMessage = String(parsed.message).trim();
        if (parsed?.reason) alertReason = String(parsed.reason).trim();
        if (parsed?.risk_level) riskLevel = String(parsed.risk_level).toUpperCase().trim();
      } catch (_) {
        const jsonMatch = grokResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsedInline = JSON.parse(jsonMatch[0]);
            if (parsedInline?.message) alertMessage = String(parsedInline.message).trim();
            if (parsedInline?.reason) alertReason = String(parsedInline.reason).trim();
            if (parsedInline?.risk_level) riskLevel = String(parsedInline.risk_level).toUpperCase().trim();
          } catch (_) {
            // Ignore and continue with regex/raw fallback.
          }
        }

        const messageMatch = grokResponse.match(/(?:MESSAGE|message)\s*[:=-]\s*(.+?)(?:\n|$)/);
        const reasonMatch = grokResponse.match(/(?:REASON|reason)\s*[:=-]\s*(.+?)(?:\n|$)/);
        const riskMatch = grokResponse.match(/(?:RISK|risk|risk_level)\s*[:=-]\s*(low|medium|high|critical)/i);

        if (messageMatch) alertMessage = messageMatch[1].trim();
        else if (grokResponse.trim()) alertMessage = grokResponse.split("\n")[0].trim();

        if (reasonMatch) alertReason = reasonMatch[1].trim();
        if (riskMatch) riskLevel = riskMatch[1].toLowerCase().trim();
      }

      if (!["low", "medium", "high", "critical"].includes(riskLevel)) {
        riskLevel = "medium";
      }
      
      logger.info("Dynamic alert generated via Grok", {
        farmerId,
        message: alertMessage,
        riskLevel,
        action: "alerts.grok.generated"
      });
    }
  } catch (err) {
    logger.warn("Grok alert generation failed, using defaults", {
      farmerId,
      error: err.message,
      action: "alerts.grok.fallback"
    });
  }
  
  const id = uuidv4();
  const sql = `
    INSERT INTO alerts (id, farmer_id, message, reason, risk_level, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [
    id, 
    farmerId, 
    alertMessage, 
    alertReason, 
    riskLevel, 
    "pending"
  ];
  const { rows } = await pool.query(sql, values);

  // Auto-trigger WhatsApp delivery for freshly generated alerts.
  // Keep alert generation successful even if WhatsApp send fails.
  try {
    const organizationId = user?.institutionId || farmer.organization_id;
    if (organizationId) {
      await whatsappService.initiateBot(farmerId, organizationId, "gu");
    } else {
      logger.warn("Skipping WhatsApp auto-send: organizationId missing", {
        farmerId,
        action: "alerts.whatsapp.autosend.skipped",
      });
    }
  } catch (err) {
    logger.error("WhatsApp auto-send failed after alert generation", {
      farmerId,
      error: err.message,
      action: "alerts.whatsapp.autosend.failed",
    });
  }

  return rows[0];
}

async function updateAlertStatus(user, id, status, ip) {
  const sql = "UPDATE alerts SET status = $1 WHERE id = $2 RETURNING *";
  const { rows } = await pool.query(sql, [status, id]);
  if (rows.length === 0) throw new AppError("Alert not found", 404);
  return rows[0];
}

async function getPendingHighUrgent(user) {
  const sql = `
    SELECT a.*, f.name AS farmer_name
    FROM alerts a
    LEFT JOIN farmers f ON f.id = a.farmer_id
    WHERE a.status = 'pending' AND (a.risk_level = 'high' OR a.risk_level = 'critical')
    ORDER BY a.created_at DESC
    LIMIT 5
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

function buildRuleBasedAlert({ farmer, currentMonth, season, latestScore, recentAlerts, weather }) {
  const crop = String(farmer.primary_crop || "પાક").toLowerCase();
  const soil = String(farmer.soil_type || "").toLowerCase();
  const landSize = Number(farmer.land_size || 0);
  const income = Number(farmer.annual_income || 0);
  const rainfall = Number(weather?.rainfall || 0);
  const temperature = Number(weather?.temperature || 0);

  let message = "આ અઠવાડિયે ખેતરની સ્થિતિ પર નજર રાખો અને સિંચાઈ યોજના સમાયોજિત કરો.";
  let reason = `${currentMonth} મહિનામાં ${season} માટે ઋતુ આધારિત સલાહ`;
  let risk_level = "medium";

  if (soil.includes("sandy") || landSize >= 5) {
    message = `${crop || "પાક"} માટે જમીનમાં ભેજ ઝડપથી ઘટી શકે; ઓછા અંતરે સિંચાઈ કરો.`;
    reason = "જમીન અને ક્ષેત્રફળના સ્વરૂપને કારણે ભેજ ઘટાડાનો જોખમ વધારે છે";
    risk_level = "high";
  }

  if (income > 0 && income < 150000) {
    message = `આ અઠવાડિયે ${crop || "પાક"} માટે ઓછા ખર્ચની પૂર્વચેતવણી પગલાં લો જેથી નુકસાન ઓછું થાય.`;
    reason = "આવકને અનુરૂપ ઓછા ખર્ચે જોખમ નિયંત્રણ જરૂરી છે";
    risk_level = risk_level === "high" ? "high" : "medium";
  }

  if (rainfall > 0 && rainfall < 20) {
    message = `${crop || "પાક"} માટે વરસાદ ઓછો છે; ભેજ જાળવવા મલ્ચિંગ અને તબક્કાવાર સિંચાઈ કરો.`;
    reason = `તાજેતરનો વરસાદ ${rainfall} મિ.મી. હોવાથી પાણી તંગીનું જોખમ છે`;
    risk_level = "high";
  }

  if (temperature > 0 && temperature >= 38) {
    message = `${crop || "પાક"} પર ગરમીનો દબાણ વધ્યો છે; બપોરે સિંચાઈ ટાળો અને સાંજે પાણી આપો.`;
    reason = `તાપમાન ${temperature}°C સુધી પહોંચતાં ગરમી જોખમ વધ્યો છે`;
    risk_level = risk_level === "critical" ? "critical" : "high";
  }

  if (latestScore !== null && Number(latestScore) >= 80) {
    message = `${crop || "પાક"} માટે અતિજોખમી સ્થિતિ દેખાઈ; તાત્કાલિક અધિકારીની મુલાકાત ગોઠવો.`;
    reason = `છેલ્લો વલ્નરેબિલિટી સ્કોર ${latestScore} છે`;
    risk_level = "critical";
  } else if (latestScore !== null && Number(latestScore) >= 60) {
    message = `${crop || "પાક"} માટે ઊંચું જોખમ વલણ છે; તરત જ જોખમ ઘટાડવાના પગલાંને પ્રાથમિકતા આપો.`;
    reason = `છેલ્લો વલ્નરેબિલિટી સ્કોર ${latestScore} છે`;
    risk_level = "high";
  }

  const lastMsg = recentAlerts?.[0]?.message;
  if (lastMsg && lastMsg.trim() === message.trim()) {
    message = `${message} સાથે સ્થાનિક હવામાન મુજબ ખાતર આપવાનો સમય પણ ચકાસો.`;
    reason = `${reason}; એકસરખો અલર્ટ ટાળવા બદલાયેલ સૂચન`;
  }

  return { message, reason, risk_level };
}

module.exports = {
  listAlerts,
  createAlert,
  generateAlertsForFarmer,
  updateAlertStatus,
  getPendingHighUrgent
};
