const express = require("express");
const controller = require("./farmers.controller");
const { authenticate } = require("../../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", controller.list);
router.get("/export", controller.exportCsv);
router.post("/", controller.create);
router.get("/:id", controller.get);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);

router.post("/:id/recalculate-score", controller.recalculate);
router.get("/:id/score-history", controller.history);

module.exports = router;
