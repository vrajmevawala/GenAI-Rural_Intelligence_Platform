const { successResponse } = require("../../utils/apiResponse");
const authService = require("./auth.service");

const REFRESH_COOKIE_NAME = "refresh_token";

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });
}

async function register(req, res, next) {
  try {
    const user = await authService.registerUser(req.user, req.body, req.ip);
    res.status(201).json(successResponse(user, "User registered successfully"));
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body, req.ip);
    setRefreshCookie(res, data.refreshToken);
    res.status(200).json(
      successResponse(
        { access_token: data.accessToken, user: data.user },
        "Login successful"
      )
    );
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const data = await authService.refreshSession(rawRefreshToken, req.ip);
    setRefreshCookie(res, data.refreshToken);
    res.status(200).json(successResponse({ access_token: data.accessToken }, "Token refreshed"));
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(rawRefreshToken, req.user, req.ip);
    clearRefreshCookie(res);
    res.status(200).json(successResponse({}, "Logged out"));
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.status(200).json(successResponse(user, "Current user"));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me
};
