const { errorResponse } = require("../utils/apiResponse");
const { error: logError, warn: logWarn } = require("../utils/logger");

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_SERVER_ERROR", details = []) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";
  const message = err.message || "Something went wrong";
  const details = err.details || [];

  const logPayload = {
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    message
  };

  if (statusCode >= 500) {
    logError("Request failed", logPayload);
  } else {
    logWarn("Request rejected", logPayload);
  }

  res.status(statusCode).json(errorResponse(errorCode, message, details));
}

module.exports = {
  AppError,
  errorHandler
};
