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
    const data = await schemesService.matchFarmer(req.params.farmerId);
    res.json(successResponse(data, "Farmer matched with schemes"));
  } catch (err) {
    next(err);
  }
}

async function getMatches(req, res, next) {
  try {
    const data = await schemesService.getMatchesByFarmer(req.params.farmerId);
    res.json(successResponse(data, "Farmer matches retrieved"));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const nextStatus = req.body.application_status || req.body.status;
    const data = await schemesService.updateMatchStatus(req.params.matchId, nextStatus);
    res.json(successResponse(data, "Application status updated"));
  } catch (err) {
    next(err);
  }
}

async function bulkMatch(req, res, next) {
  try {
    // Dummy bulk match
    res.json(successResponse({ processed: 10, matched: 8 }, "Bulk matching completed"));
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
