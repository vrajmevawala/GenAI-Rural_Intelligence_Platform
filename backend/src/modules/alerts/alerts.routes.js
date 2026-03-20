const express = require("express");
const controller = require("./alerts.controller");
const { authenticate } = require("../../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", controller.listAlerts);
router.post("/generate/:farmerId", controller.generateForFarmer);
router.patch("/:id/status", controller.updateStatus);
router.get("/pending", controller.pending);

module.exports = router;
