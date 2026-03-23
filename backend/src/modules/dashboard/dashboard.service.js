const { pool } = require("../../config/db");
const { getAlertDomain } = require("../../utils/alertTypes");

let farmerColumnsCache = null;

async function getFarmerColumns() {
  if (farmerColumnsCache) return farmerColumnsCache;
  const res = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'farmers'`
  );
  farmerColumnsCache = new Set(res.rows.map((r) => r.column_name));
  return farmerColumnsCache;
}

async function getUpcomingExpiries(limit = 6) {
  const cols = await getFarmerColumns();
  const list = [];

  if (cols.has("insurance_expiry_date")) {
    const insuranceRes = await pool.query(
      `SELECT id, name as farmer_name, district,
              insurance_expiry_date as expiry_date,
              'insurance'::text as type
       FROM farmers
       WHERE insurance_expiry_date IS NOT NULL
       ORDER BY insurance_expiry_date ASC
       LIMIT $1`,
      [limit]
    );
    list.push(...insuranceRes.rows.map((r) => ({ ...r, farmer_id: r.id })));
  }

  if (cols.has("loan_due_date")) {
    const loanRes = await pool.query(
      `SELECT id, name as farmer_name, district,
              loan_due_date as expiry_date,
              'loan'::text as type
       FROM farmers
       WHERE loan_due_date IS NOT NULL
       ORDER BY loan_due_date ASC
       LIMIT $1`,
      [limit]
    );
    list.push(...loanRes.rows.map((r) => ({ ...r, farmer_id: r.id })));
  }

  return list
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    .slice(0, limit);
}

async function getRecentActivity(limit = 10) {
  const [alertsRes, schemesRes, farmersRes, highRiskRes] = await Promise.all([
    pool.query(
      `SELECT 'alert_sent'::text as type,
              CONCAT('Alert generated for ', COALESCE(f.name, 'farmer')) as message,
              a.created_at
       FROM alerts a
       LEFT JOIN farmers f ON f.id = a.farmer_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    ),
    pool.query(
      `SELECT 'scheme_matched'::text as type,
              CONCAT('Scheme status updated to ', COALESCE(fs.status, 'eligible'), ' for ', COALESCE(f.name, 'farmer')) as message,
              fs.created_at
       FROM farmer_schemes fs
       LEFT JOIN farmers f ON f.id = fs.farmer_id
       ORDER BY fs.created_at DESC
       LIMIT $1`,
      [limit]
    ),
    pool.query(
      `SELECT 'farmer_added'::text as type,
              CONCAT('New farmer registered: ', name) as message,
              created_at
       FROM farmers
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    ),
    pool.query(
      `SELECT 'high_risk'::text as type,
              CONCAT(COALESCE(f.name, 'Farmer'), ' marked high risk with score ', fvi.score) as message,
              fvi.created_at
       FROM fvi_records fvi
       LEFT JOIN farmers f ON f.id = fvi.farmer_id
       WHERE fvi.score >= 80
       ORDER BY fvi.created_at DESC
       LIMIT $1`,
      [limit]
    )
  ]);

  return [
    ...alertsRes.rows,
    ...schemesRes.rows,
    ...farmersRes.rows,
    ...highRiskRes.rows
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

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

  // Alert breakdown by domain (financial/agriculture)
  const breakdownRes = await pool.query(`
    SELECT alert_type as type, COUNT(*)::int as value
    FROM alerts
    GROUP BY alert_type
  `);

  const alertBreakdownByDomain = breakdownRes.rows.reduce((acc, row) => {
    const domain = getAlertDomain(row.type);
    const value = Number(row.value || 0);
    acc[domain] = (acc[domain] || 0) + value;
    return acc;
  }, {});

  const alertBreakdown = [
    { type: "financial", value: alertBreakdownByDomain.financial || 0 },
    { type: "agriculture", value: alertBreakdownByDomain.agriculture || 0 }
  ];
  
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
  const highRiskRes = await pool.query(
    `SELECT f.id, f.name, f.village, f.district, fvi.score as vulnerability_score
     FROM farmers f
     JOIN (
       SELECT DISTINCT ON (farmer_id) farmer_id, score, created_at
       FROM fvi_records
       ORDER BY farmer_id, created_at DESC
     ) fvi ON fvi.farmer_id = f.id
     WHERE fvi.score > 60
     ORDER BY fvi.score DESC
     LIMIT 10`
  );

  const [upcomingExpiries, recentActivity] = await Promise.all([
    getUpcomingExpiries(10),
    getRecentActivity(10)
  ]);

  return {
    total_farmers: farmersRes.rows[0].count,
    alerts_sent: alertsRes.rows[0].count,
    critical_count: criticalRes.rows[0].count,
    schemes_matched: schemesRes.rows[0].count,
    avg_score: avgScoreRes.rows[0]?.avg_score || 0,
    districts_count: districtsRes.rows[0].count,
    distribution: distributionRes.rows,
    alertBreakdown,
    highRiskFarmers: highRiskRes.rows,
    upcomingExpiries,
    recentActivity
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
  getAdminStats,
  getRecentActivity
};
