const { successResponse } = require("../../utils/apiResponse");
const institutionsService = require("./institutions.service");

async function list(req, res, next) {
  try {
    const data = await institutionsService.listInstitutions();
    res.status(200).json(successResponse(data, "Institutions retrieved"));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await institutionsService.createInstitution(req.body);
    res.status(201).json(successResponse(data, "Institution created successfully"));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const data = await institutionsService.getInstitutionById(req.params.id);
    res.status(200).json(successResponse(data, "Institution retrieved"));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await institutionsService.updateInstitution(req.params.id, req.body);
    res.status(200).json(successResponse(data, "Institution updated successfully"));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const data = await institutionsService.deleteInstitution(req.params.id);
    res.status(200).json(successResponse(data, "Institution deleted successfully"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  create,
  get,
  update,
  remove
};
