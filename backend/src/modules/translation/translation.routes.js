const express = require("express");
const router = express.Router();
const translationController = require("./translation.controller");
const { authenticate } = require("../../middleware/auth");

router.post("/data", authenticate, translationController.translateData);
router.post("/tts", authenticate, translationController.generateTts);

module.exports = router;
