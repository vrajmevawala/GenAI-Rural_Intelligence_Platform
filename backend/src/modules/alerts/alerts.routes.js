const express = require("express");
const Joi = require("joi");
const { authenticate, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const controller = require("./alerts.controller");

const router = express.Router();

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  priority: Joi.string().valid("low", "medium", "high", "urgent"),
  status: Joi.string().valid("pending", "sent", "failed", "dismissed"),
  alert_type: Joi.string().valid(
    "insurance_expiry",
    "loan_overdue",
    "weather_risk",
    "scheme_opportunity",
    "pm_kisan_pending",
    "custom"
  ),
  farmer_id: Joi.string().uuid()
});

const statusSchema = Joi.object({
  status: Joi.string().valid("sent", "dismissed").required()
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const farmerIdParamSchema = Joi.object({
  farmerId: Joi.string().uuid().required()
});

router.use(authenticate);

router.get(
  "/",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ query: listQuerySchema }),
  controller.listAlerts
);
router.post(
  "/generate/:farmerId",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ params: farmerIdParamSchema }),
  controller.generateForFarmer
);
router.post("/generate-bulk", requireRole("org_admin", "superadmin"), controller.generateBulk);
router.patch(
  "/:id/status",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ params: idParamSchema, body: statusSchema }),
  controller.updateStatus
);
router.get("/pending", requireRole("field_officer", "org_admin", "superadmin"), controller.pending);

module.exports = router;
