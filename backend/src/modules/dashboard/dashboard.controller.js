const { pool } = require("../../config/db");
const { successResponse } = require("../../utils/apiResponse");

async function summary(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const isSuper = req.user.role === "superadmin";

    const sql = `
      WITH farmer_base AS (
        SELECT * FROM farmers ${isSuper ? "" : "WHERE organization_id = $1"}
      ),
      farmer_counts AS (
        SELECT
          COUNT(*)::int AS total_farmers,
          COUNT(*) FILTER (WHERE vulnerability_label = 'low')::int AS low_count,
          COUNT(*) FILTER (WHERE vulnerability_label = 'medium')::int AS medium_count,
          COUNT(*) FILTER (WHERE vulnerability_label = 'high')::int AS high_count,
          COUNT(*) FILTER (WHERE vulnerability_label = 'critical')::int AS critical_count,
          COUNT(*) FILTER (
            WHERE has_crop_insurance = TRUE
              AND insurance_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          )::int AS insurance_expiring_30d,
          COUNT(*) FILTER (
            WHERE loan_due_date < CURRENT_DATE
              AND (last_repayment_date IS NULL OR last_repayment_date < loan_due_date)
          )::int AS overdue_loans
        FROM farmer_base
      ),
      alert_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'low')::int AS pending_low,
          COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'medium')::int AS pending_medium,
          COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'high')::int AS pending_high,
          COUNT(*) FILTER (WHERE status = 'pending' AND priority = 'urgent')::int AS pending_urgent
        FROM alerts
        ${isSuper ? "" : "WHERE organization_id = $1"}
      ),
      scheme_pending AS (
        SELECT COUNT(*)::int AS pending_applications
        FROM farmer_scheme_matches fsm
        JOIN farmers f ON f.id = fsm.farmer_id
        WHERE fsm.application_status IN ('not_started', 'in_progress')
        ${isSuper ? "" : "AND f.organization_id = $1"}
      )
      SELECT * FROM farmer_counts CROSS JOIN alert_counts CROSS JOIN scheme_pending
    `;

    const values = isSuper ? [] : [orgId];
    const { rows } = await pool.query(sql, values);
    const row = rows[0] || {};

    const total = row.total_farmers || 0;
    const pct = (count) => (total ? Number(((count / total) * 100).toFixed(2)) : 0);

    const data = {
      total_farmers: total,
      vulnerability_breakdown: {
        low: { count: row.low_count || 0, percentage: pct(row.low_count || 0) },
        medium: { count: row.medium_count || 0, percentage: pct(row.medium_count || 0) },
        high: { count: row.high_count || 0, percentage: pct(row.high_count || 0) },
        critical: { count: row.critical_count || 0, percentage: pct(row.critical_count || 0) }
      },
      pending_alerts_by_priority: {
        low: row.pending_low || 0,
        medium: row.pending_medium || 0,
        high: row.pending_high || 0,
        urgent: row.pending_urgent || 0
      },
      scheme_matches_pending_application: row.pending_applications || 0,
      farmers_with_expiring_insurance_30d: row.insurance_expiring_30d || 0,
      farmers_with_overdue_loans: row.overdue_loans || 0
    };

    res.json(successResponse(data, "Dashboard summary"));
  } catch (err) {
    next(err);
  }
}

async function activityFeed(req, res, next) {
  try {
    const isSuper = req.user.role === "superadmin";

    const sql = `
      SELECT
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.created_at,
        u.name AS actor_name,
        CASE
          WHEN al.action = 'farmer.create' THEN CONCAT(COALESCE(u.name, 'System'), ' added a farmer record')
          WHEN al.action = 'farmer.update' THEN CONCAT(COALESCE(u.name, 'System'), ' updated farmer details')
          WHEN al.action = 'farmer.delete' THEN CONCAT(COALESCE(u.name, 'System'), ' removed a farmer record')
          WHEN al.action LIKE 'alert.%' THEN CONCAT(COALESCE(u.name, 'System'), ' handled an alert update')
          WHEN al.action LIKE 'scheme.%' THEN CONCAT(COALESCE(u.name, 'System'), ' updated scheme application workflow')
          ELSE CONCAT(COALESCE(u.name, 'System'), ' performed ', al.action)
        END AS description
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN farmers f ON al.entity_type = 'farmer' AND f.id = al.entity_id
      LEFT JOIN alerts a ON al.entity_type = 'alert' AND a.id = al.entity_id
      WHERE ${isSuper ? "TRUE" : "(u.organization_id = $1 OR f.organization_id = $1 OR a.organization_id = $1)"}
      ORDER BY al.created_at DESC
      LIMIT 20
    `;

    const values = isSuper ? [] : [req.user.organizationId];
    const { rows } = await pool.query(sql, values);

    res.json(successResponse(rows, "Activity feed"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  summary,
  activityFeed
};
