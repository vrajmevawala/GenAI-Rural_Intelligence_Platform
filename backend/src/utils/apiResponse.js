function successResponse(data, message = "OK", meta = null) {
  return {
    success: true,
    data,
    message,
    meta
  };
}

function errorResponse(code, message, details = []) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    }
  };
}

module.exports = {
  successResponse,
  errorResponse
};
