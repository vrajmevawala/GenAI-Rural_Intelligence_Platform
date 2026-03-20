const { AppError } = require("./errorHandler");

function validate({ body, query, params }) {
  return (req, res, next) => {
    if (body) {
      const { error, value } = body.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        return next(new AppError("Validation failed", 400, "VALIDATION_ERROR", error.details));
      }
      req.body = value;
    }

    if (query) {
      const { error, value } = query.validate(req.query, { abortEarly: false, stripUnknown: true });
      if (error) {
        return next(new AppError("Validation failed", 400, "VALIDATION_ERROR", error.details));
      }
      req.query = value;
    }

    if (params) {
      const { error, value } = params.validate(req.params, { abortEarly: false, stripUnknown: true });
      if (error) {
        return next(new AppError("Validation failed", 400, "VALIDATION_ERROR", error.details));
      }
      req.params = value;
    }

    return next();
  };
}

module.exports = {
  validate
};
