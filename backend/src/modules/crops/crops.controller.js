const { successResponse } = require("../../utils/apiResponse");
const cropsService = require("./crops.service");

async function list(req, res, next) {
  try {
    const data = await cropsService.listCrops();
    res.status(200).json(successResponse(data, "Crops retrieved"));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await cropsService.createCrop(req.body);
    res.status(201).json(successResponse(data, "Crop created successfully"));
  } catch (err) {
    next(err);
  }
}

async function allocate(req, res, next) {
  try {
    const data = await cropsService.allocateCropToFarmer(req.body);
    res.status(201).json(successResponse(data, "Crop allocated successfully"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  allocate
};
