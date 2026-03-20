const { successResponse } = require("../../utils/apiResponse");
const schemesService = require("./schemes.service");

async function listSchemes(req, res, next) {
  try {
    const data = await schemesService.listSchemes();
    res.json(successResponse(data, "Schemes fetched"));
  } catch (err) {
    next(err);
  }
}

async function matchFarmer(req, res, next) {
  try {
    const data = await schemesService.matchFarmerSchemes(req.user, req.params.farmerId, req.ip);
    res.json(successResponse(data, "Scheme matches generated"));
  } catch (err) {
    next(err);
  }
}

async function getMatches(req, res, next) {
  try {
    const data = await schemesService.getMatchesForFarmer(req.user, req.params.farmerId);
    res.json(successResponse(data, "Scheme matches fetched"));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await schemesService.updateMatchStatus(
      req.user,
      req.params.matchId,
      req.body.application_status,
      req.ip
    );
    res.json(successResponse(data, "Application status updated"));
  } catch (err) {
    next(err);
  }
}

async function bulkMatch(req, res, next) {
  try {
    const data = await schemesService.bulkMatch(req.user);
    res.json(successResponse(data, "Bulk scheme matching started"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSchemes,
  matchFarmer,
  getMatches,
  updateStatus,
  bulkMatch
};
