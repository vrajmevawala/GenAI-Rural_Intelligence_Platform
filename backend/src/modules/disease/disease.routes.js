const express = require("express");
const service = require("./disease.service");
const { successResponse } = require("../../utils/apiResponse");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const data = await service.listDiseaseRecords(req.query.farmerId);
    res.status(200).json(successResponse(data, "Disease records retrieved"));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = await service.createDiseaseRecord(req.body);
    res.status(201).json(successResponse(data, "Disease record created"));
  } catch (err) {
    next(err);
  }
});

router.post("/detect-disease", async (req, res, next) => {
  try {
    const { image_url } = req.body;
    const result = await service.detectDiseaseFromUrl(image_url);
    res.status(200).json(successResponse(result, "Disease detection completed"));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
