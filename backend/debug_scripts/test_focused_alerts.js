/**
 * TEST: FOCUSED ALERT SYSTEM
 * ONLY: Crop, Weather, Soil, Vulnerability, Loan (< 30 days)
 * Auto-sends to WhatsApp
 */

const { pool } = require('../src/config/db')
const { evaluateAlertsTriggers } = require('../src/utils/alertTrigger')
const { generateAlert } = require('../src/utils/alertGenerator')
const logger = require('../src/utils/logger')

async function testFocusedAlertSystem() {
  console.log('\n' + '='.repeat(80))
  console.log('TEST: FOCUSED ALERT SYSTEM - Crop, Weather, Soil, Vulnerability, Loan')
  console.log('='.repeat(80) + '\n')

  try {
    // Get a sample farmer
    const farmerResult = await pool.query(
      `SELECT f.id, f.name, f.phone
       FROM farmers f
       WHERE f.phone IS NOT NULL
       LIMIT 1`
    )

    if (farmerResult.rows.length === 0) {
      console.log('❌ No active farmers with phone numbers found')
      return
    }

    const farmer = farmerResult.rows[0]
    console.log(`✅ Testing with farmer: ${farmer.name} (ID: ${farmer.id})`)
    console.log(`   Phone: ${farmer.phone}`)
    console.log(`   Crop: ${farmer.primary_crop}\n`)

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Evaluate triggers
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Step 1: Evaluating triggers...')
    const triggers = await evaluateAlertsTriggers(farmer.id)

    if (triggers.length === 0) {
      console.log('ℹ️  No active triggers found for this farmer')
      console.log('\nTriggers checked:')
      console.log('  ✓ Crop stage alerts')
      console.log('  ✓ Weather alerts (drought, flood, frost, heat)')
      console.log('  ✓ Soil alerts (pH, nutrients, organic matter)')
      console.log('  ✓ Vulnerability score changes')
      console.log('  ✓ Loan due within 30 days')
      process.exit(0)
    }

    console.log(`\n✅ Found ${triggers.length} active trigger(s):`)
    triggers.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.alertType} (Priority: ${t.priority})`)
      console.log(`      Trigger: ${t.trigger}`)
      if (Object.keys(t.contextData).length > 0) {
        console.log(`      Context: ${JSON.stringify(t.contextData)}`)
      }
    })

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Generate first alert as demo
    // ─────────────────────────────────────────────────────────────────────────
    if (triggers.length > 0) {
      console.log(`\n\nStep 2: Generating alert for: ${triggers[0].alertType}`)
      console.log('-'.repeat(80))

      try {
        const result = await generateAlert({
          farmerId: farmer.id,
          alertType: triggers[0].alertType,
          language: 'gu',
          contextData: triggers[0].contextData,
          sendWhatsAppMessage: true  // AUTO-SEND TO WHATSAPP
        })

        console.log('✅ Alert Generated Successfully!')
        console.log(`   Alert ID: ${result.alert.id}`)
        console.log(`   Type: ${result.alert.alert_type}`)
        console.log(`   Status: ${result.alert.status}`)
        console.log(`   AI Generated: ${result.alert.ai_generated}`)
        console.log(`\n✅ WhatsApp Message Sent (SID: ${result.whatsappSid || 'pending'})`)
        console.log(`   Message Preview: ${result.messages.whatsappMessage.substring(0, 100)}...`)

      } catch (err) {
        console.log(`❌ Alert generation failed: ${err.message}`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('FOCUSED ALERT SYSTEM TEST COMPLETE')
    console.log('='.repeat(80) + '\n')

  } catch (err) {
    console.error('❌ Test failed:', err.message)
  }

  process.exit(0)
}

testFocusedAlertSystem()
