const Joi = require("joi");

const farmerIdParamSchema = Joi.object({
  farmerId: Joi.string().uuid().required()
});

const matchIdParamSchema = Joi.object({
  matchId: Joi.string().uuid().required()
});

const updateStatusSchema = Joi.object({
  application_status: Joi.string()
    .valid("eligible", "applied", "approved", "rejected", "disbursed")
    .required()
});

module.exports = {
  farmerIdParamSchema,
  matchIdParamSchema,
  updateStatusSchema
};
