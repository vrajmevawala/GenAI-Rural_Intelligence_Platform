const jwt = require("jsonwebtoken");
const { AppError } = require("./errorHandler");

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Missing access token", 401, "AUTH_INVALID_CREDENTIALS"));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError("Access token expired", 401, "AUTH_TOKEN_EXPIRED"));
    }
    return next(new AppError("Invalid access token", 401, "AUTH_INVALID_CREDENTIALS"));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401, "AUTH_INVALID_CREDENTIALS"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Permission denied", 403, "PERMISSION_DENIED"));
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
