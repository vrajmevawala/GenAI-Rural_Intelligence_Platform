const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");
const { ROLES } = require("../../config/constants");
const { AppError } = require("../../middleware/errorHandler");
const { callClaude } = require("../../utils/claudeClient");
const { writeAuditLog } = require("../../utils/logger");

const bulkJobs = new Map();

async function ensureFarmerScope(actor, farmerId) {
  const values = [farmerId];
  let sql = "SELECT * FROM farmers WHERE id = $1";

  if (actor.role !== ROLES.SUPERADMIN) {
    values.push(actor.organizationId);
    sql += " AND organization_id = $2";
  }

  const { rows } = await pool.query(sql, values);
  if (rows.length === 0) {
    throw new AppError("Farmer not found", 404, "FARMER_NOT_FOUND");
  }
  return rows[0];
}

function evaluateSchemeEligibility(farmer, scheme) {
  const missingCriteria = [];
  let score = 100;

  switch (scheme.short_code) {
    case "PM_KISAN":
      if (Number(farmer.land_area_acres) > 5) {
        missingCriteria.push("Land area must be 5 acres or less");
      }
      if (!farmer.bank_account_number) {
        missingCriteria.push("Bank account is required");
      }
      break;
    case "PMFBY":
      if (farmer.has_crop_insurance) {
        missingCriteria.push("Already insured under crop insurance");
      }
      if (!farmer.primary_crop) {
        missingCriteria.push("Notified crop details missing");
      }
      break;
    case "KCC":
      if (farmer.loan_type === "kcc") {
        missingCriteria.push("Farmer already has KCC loan");
      }
      if (farmer.annual_income_inr > 300000) {
        missingCriteria.push("Annual income must be up to INR 300000");
      }
      if (Number(farmer.land_area_acres) <= 0) {
        missingCriteria.push("Land ownership details required");
      }
      break;
    case "NRLM":
      if (farmer.annual_income_inr >= 100000) {
        missingCriteria.push("Annual income must be below INR 100000");
      }
      if (farmer.family_size < 3) {
        missingCriteria.push("Family size should be at least 3");
      }
      break;
    case "SHC":
      break;
    case "PMKMY":
      if (Number(farmer.land_area_acres) > 2) {
        missingCriteria.push("Land area must be 2 acres or less");
      }
      if (farmer.annual_income_inr > 300000) {
        missingCriteria.push("Income context suggests ineligible for pension plan");
      }
      break;
    default:
      break;
  }

  score = Math.max(0, 100 - missingCriteria.length * 25);

  return {
    is_eligible: missingCriteria.length === 0,
    eligibility_score: score,
    missing_criteria: missingCriteria
  };
}

async function generateSchemeExplanation(farmer, scheme, eligibilityResult, language) {
  const systemPrompt =
    "You are a helpful rural financial advisor in India. Explain government schemes in simple, warm language. Use simple words a farmer with primary school education can understand.";

  const userPrompt = [
    `Farmer name: ${farmer.name}`,
    `Scheme: ${scheme.name} (${scheme.short_code})`,
    `Eligible: ${eligibilityResult.is_eligible}`,
    `Eligibility score: ${eligibilityResult.eligibility_score}`,
    `Missing criteria: ${eligibilityResult.missing_criteria.join(", ") || "None"}`,
    `Language: ${language}`,
    "Explain whether the farmer is eligible and what next action to take in plain language."
  ].join("\n");

  return callClaude(systemPrompt, userPrompt, 500);
}

async function listSchemes() {
  const { rows } = await pool.query(
    `SELECT id, name, short_code, description, eligibility_rules, benefit_amount_inr, benefit_type, application_url
     FROM government_schemes
     WHERE is_active = TRUE
     ORDER BY name`
  );
  return rows;
}

async function matchFarmerSchemes(actor, farmerId, ipAddress) {
  const farmer = await ensureFarmerScope(actor, farmerId);
  const schemesRes = await pool.query("SELECT * FROM government_schemes WHERE is_active = TRUE ORDER BY name");

  const out = [];
  for (const scheme of schemesRes.rows) {
    const eligibility = evaluateSchemeEligibility(farmer, scheme);
    const explanation = await generateSchemeExplanation(
      farmer,
      scheme,
      eligibility,
      farmer.preferred_language || "gu"
    );

    const matchId = uuidv4();
    const sql = `
      INSERT INTO farmer_scheme_matches (
        id, farmer_id, scheme_id, is_eligible, eligibility_score, missing_criteria,
        ai_explanation, application_status, matched_at, status_updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'not_started', NOW(), NOW())
      ON CONFLICT (farmer_id, scheme_id)
      DO UPDATE SET
        is_eligible = EXCLUDED.is_eligible,
        eligibility_score = EXCLUDED.eligibility_score,
        missing_criteria = EXCLUDED.missing_criteria,
        ai_explanation = EXCLUDED.ai_explanation,
        matched_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [
      matchId,
      farmer.id,
      scheme.id,
      eligibility.is_eligible,
      eligibility.eligibility_score,
      JSON.stringify(eligibility.missing_criteria),
      explanation
    ]);

    out.push({ ...rows[0], scheme_name: scheme.name, short_code: scheme.short_code });
  }

  out.sort((a, b) => b.eligibility_score - a.eligibility_score);

  await writeAuditLog({
    userId: actor.userId,
    action: "scheme.match",
    entityType: "farmer",
    entityId: farmer.id,
    newValues: { matches: out.length },
    ipAddress
  });

  return out;
}

async function getMatchesForFarmer(actor, farmerId) {
  const farmer = await ensureFarmerScope(actor, farmerId);

  const { rows } = await pool.query(
    `SELECT fsm.*, gs.name AS scheme_name, gs.short_code
     FROM farmer_scheme_matches fsm
     JOIN government_schemes gs ON gs.id = fsm.scheme_id
     WHERE fsm.farmer_id = $1
     ORDER BY fsm.eligibility_score DESC, fsm.matched_at DESC`,
    [farmer.id]
  );

  return rows;
}

async function updateMatchStatus(actor, matchId, status, ipAddress) {
  const matchRes = await pool.query(
    `SELECT fsm.*, f.organization_id
     FROM farmer_scheme_matches fsm
     JOIN farmers f ON f.id = fsm.farmer_id
     WHERE fsm.id = $1`,
    [matchId]
  );

  if (matchRes.rowCount === 0) {
    throw new AppError("Match not found", 404, "MATCH_NOT_FOUND");
  }

  const current = matchRes.rows[0];

  if (actor.role !== ROLES.SUPERADMIN && current.organization_id !== actor.organizationId) {
    throw new AppError("Permission denied", 403, "PERMISSION_DENIED");
  }

  const { rows } = await pool.query(
    `UPDATE farmer_scheme_matches
     SET application_status = $1, status_updated_at = NOW(), updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, matchId]
  );

  await writeAuditLog({
    userId: actor.userId,
    action: "scheme.match.update_status",
    entityType: "farmer_scheme_match",
    entityId: matchId,
    oldValues: { application_status: current.application_status },
    newValues: { application_status: status },
    ipAddress
  });

  return rows[0];
}

async function bulkMatch(actor) {
  if (actor.role === ROLES.FIELD_OFFICER) {
    throw new AppError("Permission denied", 403, "PERMISSION_DENIED");
  }

  const jobId = uuidv4();
  bulkJobs.set(jobId, { status: "running", started_at: new Date().toISOString(), processed: 0 });

  setImmediate(async () => {
    try {
      const values = [];
      let sql = "SELECT id FROM farmers";
      if (actor.role !== ROLES.SUPERADMIN) {
        values.push(actor.organizationId);
        sql += " WHERE organization_id = $1";
      }

      const { rows } = await pool.query(sql, values);
      let processed = 0;
      for (const row of rows) {
        await matchFarmerSchemes(actor, row.id, null);
        processed += 1;
      }

      bulkJobs.set(jobId, {
        status: "completed",
        started_at: bulkJobs.get(jobId).started_at,
        finished_at: new Date().toISOString(),
        processed
      });
    } catch (err) {
      bulkJobs.set(jobId, {
        status: "failed",
        error: err.message,
        finished_at: new Date().toISOString()
      });
    }
  });

  return { job_id: jobId, status: "running" };
}

module.exports = {
  listSchemes,
  matchFarmerSchemes,
  getMatchesForFarmer,
  updateMatchStatus,
  bulkMatch,
  generateSchemeExplanation
};
