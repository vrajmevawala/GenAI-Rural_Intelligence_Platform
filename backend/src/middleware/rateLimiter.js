const rateLimit = require("express-rate-limit");
const { errorResponse } = require("../utils/apiResponse");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(errorResponse("RATE_LIMIT_EXCEEDED", "Too many requests", []));
  }
});

const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(errorResponse("RATE_LIMIT_EXCEEDED", "Too many login attempts", []));
  }
});

const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(errorResponse("RATE_LIMIT_EXCEEDED", "Too many refresh attempts", []));
  }
});

module.exports = {
  generalLimiter,
  authLoginLimiter,
  authRefreshLimiter
};
