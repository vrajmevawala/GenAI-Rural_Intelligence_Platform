const Joi = require("joi");

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const createUserSchema = Joi.object({
  organization_id: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*\d).+$/)
    .required(),
  role: Joi.string().valid("superadmin", "org_admin", "field_officer").required(),
  preferred_language: Joi.string().valid("en", "hi", "gu").default("en")
});

const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(120),
  preferred_language: Joi.string().valid("en", "hi", "gu"),
  is_active: Joi.boolean()
}).min(1);

module.exports = {
  idParamSchema,
  createUserSchema,
  updateUserSchema
};
