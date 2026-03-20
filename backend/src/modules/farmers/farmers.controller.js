const { successResponse } = require("../../utils/apiResponse");
const { getPagination, buildMeta } = require("../../utils/pagination");
const farmersService = require("./farmers.service");

async function listFarmers(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const result = await farmersService.listFarmers(req.user, req.query, page, limit, offset);
    res.json(successResponse(result.rows, "Farmers fetched", buildMeta(result)));
  } catch (err) {
    next(err);
  }
}

async function createFarmer(req, res, next) {
  try {
    const farmer = await farmersService.createFarmer(req.user, req.body, req.ip);
    res.status(201).json(successResponse(farmer, "Farmer created"));
  } catch (err) {
    next(err);
  }
}

async function getFarmer(req, res, next) {
  try {
    const farmer = await farmersService.getFarmerById(req.user, req.params.id);
    res.json(successResponse(farmer, "Farmer profile fetched"));
  } catch (err) {
    next(err);
  }
}

async function updateFarmer(req, res, next) {
  try {
    const farmer = await farmersService.updateFarmer(req.user, req.params.id, req.body, req.ip);
    res.json(successResponse(farmer, "Farmer updated"));
  } catch (err) {
    next(err);
  }
}

async function deleteFarmer(req, res, next) {
  try {
    const result = await farmersService.deleteFarmer(req.user, req.params.id, req.ip);
    res.json(successResponse(result, "Farmer deleted"));
  } catch (err) {
    next(err);
  }
}

async function scoreHistory(req, res, next) {
  try {
    const history = await farmersService.getScoreHistory(req.user, req.params.id);
    res.json(successResponse(history, "Score history fetched"));
  } catch (err) {
    next(err);
  }
}

async function recalculateScore(req, res, next) {
  try {
    const result = await farmersService.manualRecalculate(req.user, req.params.id, req.ip);
    res.json(successResponse(result, "Score recalculated"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listFarmers,
  createFarmer,
  getFarmer,
  updateFarmer,
  deleteFarmer,
  scoreHistory,
  recalculateScore
};
