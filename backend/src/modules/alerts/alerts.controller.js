const { successResponse } = require("../../utils/apiResponse");
const { getPagination, buildMeta } = require("../../utils/pagination");
const alertsService = require("./alerts.service");

async function listAlerts(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const result = await alertsService.listAlerts(req.user, req.query, page, limit, offset);
    res.json(successResponse(result.rows, "Alerts fetched", buildMeta(result)));
  } catch (err) {
    next(err);
  }
}

async function generateForFarmer(req, res, next) {
  try {
    const data = await alertsService.generateAlertsForFarmer(req.user, req.params.farmerId, req.ip);
    res.json(successResponse(data, "Alerts generated"));
  } catch (err) {
    next(err);
  }
}

async function generateBulk(req, res, next) {
  try {
    const data = await alertsService.generateBulkAlerts(req.user, req.ip);
    res.json(successResponse(data, "Bulk alert generation completed"));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await alertsService.updateAlertStatus(req.user, req.params.id, req.body.status, req.ip);
    res.json(successResponse(data, "Alert status updated"));
  } catch (err) {
    next(err);
  }
}

async function pending(req, res, next) {
  try {
    const data = await alertsService.getPendingHighUrgent(req.user);
    res.json(successResponse(data, "Pending high-priority alerts"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAlerts,
  generateForFarmer,
  generateBulk,
  updateStatus,
  pending
};
