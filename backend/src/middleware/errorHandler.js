const { errorResponse } = require("../utils/apiResponse");
const { error: logError } = require("../utils/logger");

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

  logError("Request failed", {
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    message
  });

  res.status(statusCode).json(errorResponse(errorCode, message, details));
}

module.exports = {
  AppError,
  errorHandler
};
