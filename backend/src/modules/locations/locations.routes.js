const express = require("express");
const service = require("./locations.service");
const { successResponse } = require("../../utils/apiResponse");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const data = await service.listLocations();
    res.status(200).json(successResponse(data, "Locations retrieved"));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = await service.createLocation(req.body);
    res.status(201).json(successResponse(data, "Location created"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
