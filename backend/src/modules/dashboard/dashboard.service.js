const { pool } = require("../../config/db");

async function getSummary(institutionId) {
  // Stats
  const farmersRes = await pool.query("SELECT COUNT(*)::int AS count FROM farmers");
  const alertsRes = await pool.query("SELECT COUNT(*)::int AS count FROM alerts");
  const criticalRes = await pool.query("SELECT COUNT(*)::int AS count FROM alerts WHERE risk_level = 'CRITICAL'");
  const schemesRes = await pool.query("SELECT COUNT(*)::int AS count FROM farmer_schemes");
  
  // Distribution by risk level
  const distributionRes = await pool.query(`
    SELECT risk_level as label, COUNT(*)::int as value
    FROM alerts
    GROUP BY risk_level
  `);

  // Alert breakdown by reason
  const breakdownRes = await pool.query(`
    SELECT reason as name, COUNT(*)::int as value
    FROM alerts
    GROUP BY reason
  `);
  
  // Average FVI Score (Latest per farmer)
  const avgScoreRes = await pool.query(`
    SELECT AVG(score)::int as avg_score FROM (
      SELECT DISTINCT ON (farmer_id) score 
      FROM fvi_records 
      ORDER BY farmer_id, created_at DESC
    ) as latest_scores
  `);

  // Districts Count
  const districtsRes = await pool.query("SELECT COUNT(DISTINCT district)::int as count FROM farmers");

  return {
    total_farmers: farmersRes.rows[0].count,
    alerts_sent: alertsRes.rows[0].count,
    critical_count: criticalRes.rows[0].count,
    schemes_matched: schemesRes.rows[0].count,
    avg_score: avgScoreRes.rows[0]?.avg_score || 0,
    districts_count: districtsRes.rows[0].count,
    distribution: distributionRes.rows,
    alertBreakdown: breakdownRes.rows
  };
}

async function getAdminStats() {
  const [farmersCount, cropsCount, alertsCount, institutionsCount] = await Promise.all([
    pool.query("SELECT COUNT(*)::int as count FROM farmers"),
    pool.query("SELECT COUNT(*)::int as count FROM crops"),
    pool.query("SELECT COUNT(*)::int as count FROM alerts"),
    pool.query("SELECT COUNT(*)::int as count FROM institutions")
  ]);

  return {
    farmers: farmersCount.rows[0].count,
    crops: cropsCount.rows[0].count,
    alerts: alertsCount.rows[0].count,
    institutions: institutionsCount.rows[0].count
  };
}

module.exports = {
  getSummary,
  getAdminStats
};
