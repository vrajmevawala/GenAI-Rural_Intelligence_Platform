const { pool } = require('../../config/db')
const { generateAlert } = require('../../utils/alertGenerator')
const { ALERT_TYPES, ALERT_DEDUP_WINDOWS } = require('../../utils/alertTypes')

async function checkAndTriggerAlert(farmerId, oldScore, newScore, oldLabel, newLabel) {
  const labelOrder = ['low', 'medium', 'high', 'critical']
  const oldIndex = labelOrder.indexOf(oldLabel)
  const newIndex = labelOrder.indexOf(newLabel)

  if (newIndex > oldIndex) {
    const recent = await hasRecentAlert(farmerId, ALERT_TYPES.SCORE_CHANGE, ALERT_DEDUP_WINDOWS[ALERT_TYPES.SCORE_CHANGE])
    if (!recent) {
      const farmer = await getFarmer(farmerId)
      if (farmer) {
        await generateAlert({
          farmerId,
          organizationId: farmer.organization_id,
          alertType: ALERT_TYPES.SCORE_CHANGE,
          language: farmer.preferred_language || farmer.language || 'gu',
          contextData: {
            oldScore,
            newScore,
            oldLabel,
            newLabel,
            topRiskFactors: await getTopRiskFactors(farmerId)
          },
          sendWhatsAppMessage: true
        })
      }
    }
  }

  await checkLoanOverdueTrigger(farmerId)
  await checkInsuranceExpiryTrigger(farmerId)
}

async function checkLoanOverdueTrigger(farmerId) {
  const farmer = await getFarmerWithCondition(
    farmerId,
    `loan_due_date < NOW() AND loan_type IS NOT NULL AND lower(loan_type) != 'none'`,
    ALERT_TYPES.LOAN_OVERDUE,
    ALERT_DEDUP_WINDOWS[ALERT_TYPES.LOAN_OVERDUE]
  )
  if (!farmer) return

  await generateAlert({
    farmerId: farmer.id,
    organizationId: farmer.organization_id,
    alertType: ALERT_TYPES.LOAN_OVERDUE,
    language: farmer.preferred_language || farmer.language || 'gu',
    contextData: {},
    sendWhatsAppMessage: true
  })
}

async function checkInsuranceExpiryTrigger(farmerId) {
  const farmer = await getFarmerWithCondition(
    farmerId,
    `has_crop_insurance = true
     AND insurance_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'`,
    ALERT_TYPES.INSURANCE_EXPIRY,
    ALERT_DEDUP_WINDOWS[ALERT_TYPES.INSURANCE_EXPIRY]
  )
  if (!farmer) return

  await generateAlert({
    farmerId: farmer.id,
    organizationId: farmer.organization_id,
    alertType: ALERT_TYPES.INSURANCE_EXPIRY,
    language: farmer.preferred_language || farmer.language || 'gu',
    contextData: {},
    sendWhatsAppMessage: true
  })
}

async function getFarmerWithCondition(farmerId, condition, alertType, dedupWindow) {
  const result = await pool.query(
    `SELECT f.* FROM farmers f
     WHERE f.id = $1
       AND ${condition}
       AND f.phone IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM alerts a
         WHERE a.farmer_id = f.id
           AND a.alert_type = $2
           AND a.created_at > NOW() - INTERVAL '${dedupWindow}'
       )`,
    [farmerId, alertType]
  )

  return result.rows[0] || null
}

async function hasRecentAlert(farmerId, alertType, dedupWindow) {
  const recent = await pool.query(
    `SELECT id FROM alerts
     WHERE farmer_id = $1
       AND alert_type = $2
       AND created_at > NOW() - INTERVAL '${dedupWindow}'
     LIMIT 1`,
    [farmerId, alertType]
  )
  return recent.rows.length > 0
}

async function getFarmer(farmerId) {
  const result = await pool.query('SELECT * FROM farmers WHERE id = $1', [farmerId])
  return result.rows[0] || null
}

async function getTopRiskFactors(farmerId) {
  const result = await pool.query(
    `SELECT breakdown
     FROM fvi_records
     WHERE farmer_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [farmerId]
  )

  const breakdown = result.rows[0]?.breakdown
  if (!breakdown || typeof breakdown !== 'object') {
    return 'multiple factors'
  }

  const sorted = Object.entries(breakdown)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3)
    .map(([factor, score]) => `${factor} (${score} pts)`)

  return sorted.join(', ') || 'multiple factors'
}

module.exports = { checkAndTriggerAlert }
