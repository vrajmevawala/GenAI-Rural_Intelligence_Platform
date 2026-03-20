const express = require("express");
const controller = require("./institutions.controller");
// const { authenticate } = require("../../middleware/auth"); // Assuming there's an auth middleware

const router = express.Router();

// router.use(authenticate); // Should probably be protected

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.get);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
