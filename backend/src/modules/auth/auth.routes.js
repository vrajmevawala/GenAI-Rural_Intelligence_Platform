const express = require("express");
const { authenticate, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { authLoginLimiter, authRefreshLimiter } = require("../../middleware/rateLimiter");
const controller = require("./auth.controller");
const { registerSchema, loginSchema } = require("./auth.schema");

const router = express.Router();

router.post(
  "/register",
  authenticate,
  requireRole("org_admin", "superadmin"),
  validate({ body: registerSchema }),
  controller.register
);

router.post("/login", authLoginLimiter, validate({ body: loginSchema }), controller.login);
router.post("/refresh", authRefreshLimiter, controller.refresh);
router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.me);

module.exports = router;
