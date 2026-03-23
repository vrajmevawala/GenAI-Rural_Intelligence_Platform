const express = require("express");
const controller = require("./telegram.controller");

const router = express.Router();

router.post("/webhook", controller.handleWebhook);
router.post("/set-webhook", controller.setWebhook);
router.get("/models", controller.listModels);

module.exports = router;
