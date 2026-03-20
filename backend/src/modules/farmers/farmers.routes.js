const express = require("express");
const { authenticate, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const controller = require("./farmers.controller");
const {
  createFarmerSchema,
  updateFarmerSchema,
  listFarmersQuerySchema,
  idParamSchema
} = require("./farmers.schema");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ query: listFarmersQuerySchema }),
  controller.listFarmers
);
router.post(
  "/",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ body: createFarmerSchema }),
  controller.createFarmer
);
router.get(
  "/:id",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ params: idParamSchema }),
  controller.getFarmer
);
router.patch(
  "/:id",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ params: idParamSchema, body: updateFarmerSchema }),
  controller.updateFarmer
);
router.delete(
  "/:id",
  requireRole("org_admin", "superadmin"),
  validate({ params: idParamSchema }),
  controller.deleteFarmer
);
router.get(
  "/:id/score-history",
  requireRole("field_officer", "org_admin", "superadmin"),
  validate({ params: idParamSchema }),
  controller.scoreHistory
);
router.post(
  "/:id/recalculate-score",
  requireRole("org_admin", "superadmin"),
  validate({ params: idParamSchema }),
  controller.recalculateScore
);

module.exports = router;
