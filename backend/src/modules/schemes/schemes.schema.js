const Joi = require("joi");

const farmerIdParamSchema = Joi.object({
  farmerId: Joi.string().uuid().required()
});

const matchIdParamSchema = Joi.object({
  matchId: Joi.string().uuid().required()
});

const updateStatusSchema = Joi.object({
  application_status: Joi.string()
    .valid("not_started", "in_progress", "submitted", "approved", "rejected")
    .required()
});

module.exports = {
  farmerIdParamSchema,
  matchIdParamSchema,
  updateStatusSchema
};
