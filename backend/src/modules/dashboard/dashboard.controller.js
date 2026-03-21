const dashboardService = require("./dashboard.service");
const { successResponse } = require("../../utils/apiResponse");

async function summary(req, res, next) {
  try {
    const institutionId = req.user.institutionId;
    const data = await dashboardService.getSummary(institutionId);
    res.json(successResponse(data, "Dashboard summary"));
  } catch (err) {
    next(err);
  }
}

async function activityFeed(req, res, next) {
  try {
    const data = await dashboardService.getRecentActivity(10);
    res.json(successResponse(data, "Activity feed"));
  } catch (err) {
    next(err);
  }
}

async function adminStats(req, res, next) {
  try {
    const data = await dashboardService.getAdminStats();
    res.json(successResponse(data, "Admin stats"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  summary,
  activityFeed,
  adminStats
};
