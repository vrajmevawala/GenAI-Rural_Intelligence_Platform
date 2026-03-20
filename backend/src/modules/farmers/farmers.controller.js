const { successResponse } = require("../../utils/apiResponse");
const farmersService = require("./farmers.service");

async function list(req, res, next) {
  try {
    const { district, village, soil_type, search, limit, offset } = req.query;
    const data = await farmersService.listFarmers(
      { district, village, soil_type, search },
      Number(limit || 10),
      Number(offset || 0)
    );
    res.status(200).json(successResponse(data, "Farmers retrieved"));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await farmersService.createFarmer(req.body);
    res.status(201).json(successResponse(data, "Farmer created successfully"));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const data = await farmersService.getFarmerById(req.params.id);
    res.status(200).json(successResponse(data, "Farmer retrieved"));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await farmersService.updateFarmer(req.params.id, req.body);
    res.status(200).json(successResponse(data, "Farmer updated successfully"));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await farmersService.deleteFarmer(req.params.id);
    res.status(200).json(successResponse(data, "Farmer deleted successfully"));
  } catch (err) {
    next(err);
  }
}

async function recalculate(req, res, next) {
  try {
    const data = await farmersService.recalculateScore(req.params.id);
    res.status(200).json(successResponse(data, "Score recalculated"));
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const data = await farmersService.getScoreHistory(req.params.id);
    res.status(200).json(successResponse(data, "Score history retrieved"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  get,
  update,
  remove,
  recalculate,
  history
};
