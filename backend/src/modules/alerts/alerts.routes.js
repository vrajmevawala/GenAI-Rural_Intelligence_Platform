const express = require("express");
const controller = require("./alerts.controller");
const { authenticate } = require("../../middleware/auth");
const { generateIntelligentAlerts } = require("./intelligentAlerts");

const router = express.Router();

router.use(authenticate);

router.get("/", controller.listAlerts);
router.post("/generate/:farmerId", controller.generateForFarmer);
router.post("/intelligent/:farmerId", async (req, res, next) => {
  try {
    const { farmerId } = req.params;
    const { sendWhatsApp = true } = req.body; // ✅ Alerts auto-send by default
    
    const alerts = await generateIntelligentAlerts(farmerId, sendWhatsApp);
    res.json({
      success: true,
      data: { alertsGenerated: alerts.length, alerts },
      message: `Generated ${alerts.length} intelligent alerts${sendWhatsApp ? ' (sent to WhatsApp)' : ''}`
    });
  } catch (err) {
    next(err);
  }
});
router.patch("/:id/status", controller.updateStatus);
router.get("/pending", controller.pending);

module.exports = router;
