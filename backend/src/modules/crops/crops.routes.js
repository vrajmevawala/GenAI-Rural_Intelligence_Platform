const express = require("express");
const controller = require("./crops.controller");

const router = express.Router();

router.get("/", controller.list);
router.post("/", controller.create);
router.post("/allocate", controller.allocate);

module.exports = router;
