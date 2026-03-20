const express = require("express");
const { authenticate, requireRole } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const controller = require("./users.controller");
const { idParamSchema, createUserSchema, updateUserSchema } = require("./users.schema");

const router = express.Router();

router.use(authenticate);

router.get("/", requireRole("org_admin", "superadmin"), controller.listUsers);
router.post(
  "/",
  requireRole("org_admin", "superadmin"),
  validate({ body: createUserSchema }),
  controller.createUser
);
router.get(
  "/:id",
  requireRole("org_admin", "superadmin"),
  validate({ params: idParamSchema }),
  controller.getUser
);
router.patch(
  "/:id",
  requireRole("org_admin", "superadmin"),
  validate({ params: idParamSchema, body: updateUserSchema }),
  controller.updateUser
);
router.delete(
  "/:id",
  requireRole("org_admin", "superadmin"),
  validate({ params: idParamSchema }),
  controller.deleteUser
);

module.exports = router;
