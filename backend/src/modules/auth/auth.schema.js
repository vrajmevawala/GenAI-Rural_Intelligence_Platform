const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*\d).+$/)
    .required(),
  role: Joi.string().valid("superadmin", "org_admin", "field_officer").required(),
  organization_id: Joi.string().uuid().required(),
  preferred_language: Joi.string().valid("en", "hi", "gu").default("en")
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

module.exports = {
  registerSchema,
  loginSchema
};
