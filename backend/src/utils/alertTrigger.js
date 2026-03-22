/**
 * ─── ALERT TRIGGER ENGINE ────────────────────────────────────────────────────
 * Generates alerts based on multiple data sources:
 * - Crop type + current stage
 * - Weather risks (drought, excess rain, frost, heat)
 * - Soil conditions (pH, moisture, nutrients)
 * - Loan status (due dates, interest rates)
 * - Rare schemas: PM-KISAN enrollment, KCC, insurance expiry
 * ────────────────────────────────────────────────────────────────────────────
 */

const { pool } = require('../config/db')
const { getWeather } = require('../modules/weather/weather.service')
const logger = require('./logger')

/**
 * Evaluate farmer eligibility for alerts based on CORE conditions ONLY:
 * - Crop stage alerts
 * - Weather risks
 * - Soil deficiencies
 * - Vulnerability score changes
 * - Loan due within 30 days
 * 
 * Returns array of relevant alert types with priority
 */
async function evaluateAlertsTriggers(farmerId) {
  try {
    const farmer = await getFarmerCompleteProfile(farmerId)
    if (!farmer) {
      logger.warn(`Farmer not found for alert evaluation: ${farmerId}`)
      return []
    }

    const triggers = []

    // 1. CROP-stage alerts (planting, growth, flowering, harvest, post-harvest)
    const cropAlerts = await evaluateCropStageAlerts(farmer)
    triggers.push(...cropAlerts)

    // 2. WEATHER-based alerts (drought, flood, frost, heat)
    const weatherAlerts = await evaluateWeatherAlerts(farmer)
    triggers.push(...weatherAlerts)

    // 3. SOIL condition alerts (pH, nitrogen, phosphorus, potassium, organic matter)
    const soilAlerts = evaluateSoilAlerts(farmer)
    triggers.push(...soilAlerts)

    // 4. VULNERABILITY score change alerts
    const vulnerabilityAlerts = await evaluateVulnerabilityAlerts(farmer)
    triggers.push(...vulnerabilityAlerts)

    // 5. LOAN DUE SOON (only within 30 days)
    const loanAlerts = evaluateLoanAlertsShortTerm(farmer)
    triggers.push(...loanAlerts)

    // Remove duplicates and sort by priority
    const unique = [...new Map(triggers.map((t) => [t.alertType, t])).values()]
    return unique.sort((a, b) => a.priority - b.priority)
  } catch (err) {
    logger.error('Alert trigger evaluation failed:', {
      farmerId,
      error: err.message
    })
    return []
  }
}

/**
 * Fetch complete farmer profile with all related data
 */
async function getFarmerCompleteProfile(farmerId) {
  const result = await pool.query(
    `SELECT f.*,
            c.name as primary_crop,
            c.id as crop_id,
            MAX(fc.created_at) as crop_planted_date,
            (SELECT score FROM fvi_records WHERE farmer_id = f.id ORDER BY created_at DESC LIMIT 1) as vulnerability_score,
            (SELECT to_jsonb(data) FROM soil_tests WHERE farmer_id = f.id ORDER BY created_at DESC LIMIT 1) as latest_soil_test
     FROM farmers f
     LEFT JOIN farmer_crops fc ON f.id = fc.farmer_id
     LEFT JOIN crops c ON c.id = fc.crop_id
     WHERE f.id = $1
     GROUP BY f.id, c.name, c.id
     ORDER BY fc.created_at DESC
     LIMIT 1`,
    [farmerId]
  )

  return result.rows[0] || null
}

/**
 * Evaluate weather-based alerts
 */
async function evaluateWeatherAlerts(farmer) {
  const alerts = []
  try {
    if (!farmer.latitude || !farmer.longitude) {
      return alerts
    }

    const weather = await getWeather(farmer.latitude, farmer.longitude)
    if (!weather) return alerts

    const { temperature, rainfall, humidity, condition } = weather

    // Drought risk (low rainfall, high temperature, low humidity)
    if (rainfall < 5 && temperature > 35 && humidity < 30) {
      alerts.push({
        alertType: 'WEATHER_DROUGHT',
        priority: 1,
        trigger: 'drought_risk',
        contextData: { temperature, rainfall, humidity, crop: farmer.primary_crop }
      })
    }

    // Excess rainfall risk (flood, crop damage)
    if (rainfall > 50 && condition === 'rainy') {
      alerts.push({
        alertType: 'WEATHER_EXCESS_RAIN',
        priority: 2,
        trigger: 'excess_rainfall_risk',
        contextData: { rainfall, crop: farmer.primary_crop, condition }
      })
    }

    // Frost risk (cold nights, temperature < 5°C)
    if (temperature < 5 && farmer.primary_crop && ['wheat', 'potato', 'ગમ્મ', 'માખણ'].includes(farmer.primary_crop.toLowerCase())) {
      alerts.push({
        alertType: 'WEATHER_FROST',
        priority: 3,
        trigger: 'frost_risk',
        contextData: { temperature, crop: farmer.primary_crop }
      })
    }

    // Heat wave risk (temperature > 40°C)
    if (temperature > 40 && ['cotton', 'groundnut', 'મરચું'].includes(farmer.primary_crop?.toLowerCase())) {
      alerts.push({
        alertType: 'WEATHER_HEAT',
        priority: 4,
        trigger: 'heat_wave_risk',
        contextData: { temperature, crop: farmer.primary_crop }
      })
    }
  } catch (err) {
    logger.warn('Weather alert evaluation failed:', { farmerId: farmer.id, error: err.message })
  }

  return alerts
}

/**
 * Evaluate crop stage-based alerts
 */
async function evaluateCropStageAlerts(farmer) {
  const alerts = []
  try {
    if (!farmer.primary_crop || !farmer.crop_planted_date) {
      return alerts
    }

    const plantedDate = new Date(farmer.crop_planted_date)
    const daysGrown = Math.floor((Date.now() - plantedDate.getTime()) / (1000 * 60 * 60 * 24))

    // Crop stage maturity check (typical crop cycles)
    const cropCycles = {
      'wheat': { seedling: [0, 20], growth: [21, 60], flowering: [61, 90], maturity: [91, 120] },
      'cotton': { seedling: [0, 30], growth: [31, 90], flowering: [91, 150], maturity: [151, 180] },
      'ગમ్મ': { seedling: [0, 18], growth: [19, 50], flowering: [51, 75], maturity: [76, 95] },
      'rice': { seedling: [0, 30], growth: [31, 60], flowering: [61, 90], maturity: [91, 120] }
    }

    const cycle = cropCycles[farmer.primary_crop?.toLowerCase()] || null
    if (!cycle) return alerts

    // Alert for each stage transition
    if (daysGrown >= 20 && daysGrown <= 22) {
      alerts.push({
        alertType: 'CROP_GROWTH_STAGE',
        priority: 5,
        trigger: 'crop_growth_transition',
        contextData: { crop: farmer.primary_crop, stage: 'seedling_to_growth', daysGrown }
      })
    }

    if (daysGrown >= 60 && daysGrown <= 62) {
      alerts.push({
        alertType: 'CROP_FLOWERING_STAGE',
        priority: 5,
        trigger: 'crop_flowering_critical',
        contextData: { crop: farmer.primary_crop, stage: 'flowering', daysGrown }
      })
    }

    if (daysGrown >= 90 && daysGrown <= 92) {
      alerts.push({
        alertType: 'CROP_HARVEST_READY',
        priority: 4,
        trigger: 'crop_ready_harvest',
        contextData: { crop: farmer.primary_crop, stage: 'ready_for_harvest', daysGrown }
      })
    }
  } catch (err) {
    logger.warn('Crop stage alert evaluation failed:', { farmerId: farmer.id, error: err.message })
  }

  return alerts
}

/**
 * Evaluate soil condition-based alerts
 */
function evaluateSoilAlerts(farmer) {
  const alerts = []
  try {
    if (!farmer.latest_soil_test) {
      return alerts
    }

    const soilData = farmer.latest_soil_test
    const { pH, nitrogen, phosphorus, potassium, organic_matter } = soilData

    // Soil pH imbalance
    if (pH < 5.5 || pH > 8.5) {
      alerts.push({
        alertType: 'SOIL_PH_IMBALANCE',
        priority: 5,
        trigger: 'soil_ph_incorrect',
        contextData: { pH, crop: farmer.primary_crop }
      })
    }

    // Nitrogen deficiency
    if (nitrogen && nitrogen < 200) {
      alerts.push({
        alertType: 'SOIL_NITROGEN_LOW',
        priority: 6,
        trigger: 'nitrogen_deficiency',
        contextData: { nitrogen, crop: farmer.primary_crop }
      })
    }

    // Phosphorus deficiency
    if (phosphorus && phosphorus < 15) {
      alerts.push({
        alertType: 'SOIL_PHOSPHORUS_LOW',
        priority: 6,
        trigger: 'phosphorus_deficiency',
        contextData: { phosphorus, crop: farmer.primary_crop }
      })
    }

    // Potassium deficiency
    if (potassium && potassium < 150) {
      alerts.push({
        alertType: 'SOIL_POTASSIUM_LOW',
        priority: 6,
        trigger: 'potassium_deficiency',
        contextData: { potassium, crop: farmer.primary_crop }
      })
    }

    // Low organic matter
    if (organic_matter && organic_matter < 0.5) {
      alerts.push({
        alertType: 'SOIL_ORGANIC_LOW',
        priority: 7,
        trigger: 'low_organic_matter',
        contextData: { organic_matter, crop: farmer.primary_crop }
      })
    }
  } catch (err) {
    logger.warn('Soil alert evaluation failed:', { farmerId: farmer.id, error: err.message })
  }

  return alerts
}

/**
 * ONLY: Evaluate loan alerts for loans due within NEXT 30 DAYS (not overdue)
 */
function evaluateLoanAlertsShortTerm(farmer) {
  const alerts = []
  try {
    const loanDueDate = (farmer.loan_due_date ? new Date(farmer.loan_due_date) : null)
    if (!loanDueDate) return alerts

    const daysUntilDue = Math.floor((loanDueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    // ONLY: Loan due within next 1-30 days (not overdue)
    if (daysUntilDue > 0 && daysUntilDue <= 30) {
      alerts.push({
        alertType: 'LOAN_DUE_SOON',
        priority: 1,
        trigger: 'loan_due_within_30_days',
        contextData: { daysUntilDue, loanType: farmer.loan_type }
      })
    }
  } catch (err) {
    logger.warn('Loan alert evaluation failed:', { farmerId: farmer.id, error: err.message })
  }

  return alerts
}

/**
 * Evaluate vulnerability score change alerts
 */
async function evaluateVulnerabilityAlerts(farmer) {
  const alerts = []
  try {
    if (!farmer.vulnerability_score) {
      return alerts
    }

    // Get previous vulnerability score
    const prevResult = await pool.query(
      `SELECT score FROM fvi_records 
       WHERE farmer_id = $1 
       ORDER BY created_at DESC 
       LIMIT 2`,
      [farmer.id]
    )

    if (prevResult.rows.length < 2) {
      return alerts // Not enough history
    }

    const currentScore = prevResult.rows[0].score
    const previousScore = prevResult.rows[1].score
    const scoreChange = currentScore - previousScore

    // Alert if score increased significantly (vulnerability worsened)
    if (scoreChange > 10) {
      alerts.push({
        alertType: 'VULNERABILITY_INCREASED',
        priority: 2,
        trigger: 'vulnerability_score_worsened',
        contextData: {
          currentScore,
          previousScore,
          changeAmount: scoreChange
        }
      })
    }
  } catch (err) {
    logger.warn('Vulnerability alert evaluation failed:', { farmerId: farmer.id, error: err.message })
  }

  return alerts
}

/**
 * Evaluate rare schema alerts (PM-KISAN, KCC, subsidies)
 * REMOVED - Not used in current alert system
 */
async function evaluateRareSchemaAlerts(farmer) {
  return [] // Disabled
}

module.exports = {
  evaluateAlertsTriggers,
  getFarmerCompleteProfile,
  evaluateWeatherAlerts,
  evaluateCropStageAlerts,
  evaluateSoilAlerts,
  evaluateVulnerabilityAlerts,
  evaluateLoanAlertsShortTerm
}
