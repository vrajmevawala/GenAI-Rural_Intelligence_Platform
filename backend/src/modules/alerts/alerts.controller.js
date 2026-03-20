const { successResponse } = require("../../utils/apiResponse");
const alertsService = require("./alerts.service");

async function listAlerts(req, res, next) {
  try {
    const { farmer_id } = req.query;
    const data = await alertsService.listAlerts(farmer_id);
    res.json(successResponse(data, "Alerts retrieved"));
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
  updateStatus,
  pending
};
