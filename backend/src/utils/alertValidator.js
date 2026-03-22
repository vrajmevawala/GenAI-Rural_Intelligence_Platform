const { CROP_KNOWLEDGE } = require('./cropKnowledge');
const { info, warn, error } = require('./logger');

function validateAlertResponse(text, farmer, alertType) {
  const errors = [];
  const warnings = [];
  const lower = text.toLowerCase();

  // HARD FAILURES — reject the response
  const bannedPhrases = [
    { phrase: 'ખેડૂત મિત્રો', reason: 'Generic greeting to all farmers' },
    { phrase: 'khedut mitro', reason: 'Generic greeting' },
    { phrase: 'dear farmer', reason: 'Generic English greeting' },
    { phrase: 'visit your nearest', reason: 'No specific branch named' },
    { phrase: 'we are here to help', reason: 'Empty phrase' },
    { phrase: 'it is important to', reason: 'Filler phrase' },
    { phrase: 'in general', reason: 'Generic advice' },
    { phrase: 'typically', reason: 'Generic advice' },
    { phrase: 'farming is', reason: 'Generic farming statement' },
    { phrase: 'agriculture is', reason: 'Generic statement' },
    { phrase: 'as a farmer', reason: 'Generic addressing' },
    { phrase: 'farmers should', reason: 'Generic instruction' },
    { phrase: 'you should consider', reason: 'Weak instruction' },
    { phrase: 'please contact your bank', reason: 'No specific bank named' },
    { phrase: 'અમે તૈયાર છીએ', reason: 'Empty motivational phrase' },
    { phrase: 'ખેતીને આર્થિક', reason: 'Generic farming statement' },
  ];

  for (const { phrase, reason } of bannedPhrases) {
    if (lower.includes(phrase.toLowerCase())) {
      errors.push(`BANNED PHRASE: "${phrase}" — ${reason}`);
    }
  }

  // Check farmer name is mentioned
  const firstName = farmer.name.split(' ')[0];
  if (!lower.includes(firstName.toLowerCase())) {
    errors.push(`MISSING FARMER NAME: "${farmer.name}" not found in alert`);
  }

  // Check crop is mentioned
  if (farmer.primary_crop) {
    const cropLower = farmer.primary_crop.toLowerCase();
    const cropGu = CROP_KNOWLEDGE[cropLower]?.gujarati_name;
    
    if (!lower.includes(cropLower) && (!cropGu || !text.includes(cropGu))) {
      errors.push(`MISSING CROP: "${farmer.primary_crop}" not found in alert`);
    }
  }

  // Check district is mentioned
  if (farmer.district && !lower.includes(farmer.district.toLowerCase())) {
    warnings.push(`District "${farmer.district}" not mentioned`);
  }

  // Check has at least one number (₹ or measurement)
  const hasNumber = /₹\d+|\d+\s*(ml|g|kg|litre|acre|day|din|viga|°C|%|\%)/.test(text);
  if (!hasNumber) {
    errors.push('NO SPECIFIC NUMBER: Alert has no ₹ amount, measurement, or dose');
  }

  // Check minimum length (too short = probably generic)
  if (text.length < 200) {
    errors.push(`TOO SHORT: ${text.length} chars — minimum 200 required for actionable alert`);
  }

  // Check maximum length for WhatsApp
  if (text.length > 900) {
    warnings.push(`TOO LONG: ${text.length} chars — WhatsApp shows max 850`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 25) - (warnings.length * 5))
  };
}

// Validate and log — call this after every Groq alert generation
function validateAndLog(text, farmer, alertType) {
  const result = validateAlertResponse(text, farmer, alertType);

  if (!result.isValid) {
    error(`INVALID alert for farmer ${farmer.id} (${alertType}):`, {});
    result.errors.forEach((e) => {
      error(`  ❌ ${e}`, {});
    });
  }

  if (result.warnings.length > 0) {
    result.warnings.forEach((w) => {
      warn(`  ⚠️  ${w}`, {});
    });
  }

  info(`Alert validation score: ${result.score}/100 for ${alertType}`, {
    farmerId: farmer.id,
    alertType,
    validationScore: result.score,
    isValid: result.isValid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length
  });

  return result;
}

module.exports = {
  validateAlertResponse,
  validateAndLog
};
