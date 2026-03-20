const express = require("express");
const { authenticate, requireRole } = require("../../middleware/auth");
const controller = require("./dashboard.controller");

const router = express.Router();

router.use(authenticate);
router.get("/summary", requireRole("field_officer", "org_admin", "superadmin"), controller.summary);
router.get(
  "/activity-feed",
  requireRole("field_officer", "org_admin", "superadmin"),
  controller.activityFeed
);
router.get("/admin-stats", requireRole("superadmin"), controller.adminStats);

module.exports = router;
