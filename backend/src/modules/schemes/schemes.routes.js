const express = require("express");
const { authenticate, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const controller = require("./schemes.controller");
const {
  farmerIdParamSchema,
  matchIdParamSchema,
  updateStatusSchema
} = require("./schemes.schema");

const router = express.Router();

router.use(authenticate);

router.get("/", requireRole("field_officer", "org_admin", "superadmin"), controller.listSchemes);
router.post(
  "/match/:farmerId",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ params: farmerIdParamSchema }),
  controller.matchFarmer
);
router.get(
  "/matches/:farmerId",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ params: farmerIdParamSchema }),
  controller.getMatches
);
router.patch(
  "/matches/:matchId/status",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ params: matchIdParamSchema, body: updateStatusSchema }),
  controller.updateStatus
);
router.post("/bulk-match", requireRole("org_admin", "superadmin"), controller.bulkMatch);

module.exports = router;
