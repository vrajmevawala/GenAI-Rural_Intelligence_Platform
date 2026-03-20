const Joi = require("joi");

const baseFarmerFields = {
  organization_id: Joi.string().uuid(),
  name: Joi.string().min(2).max(120).required(),
  phone: Joi.string().min(10).max(20).required(),
  aadhaar_last4: Joi.string().pattern(/^\d{4}$/).required(),
  district: Joi.string().max(100).required(),
  taluka: Joi.string().max(100).required(),
  village: Joi.string().max(100).required(),
  state: Joi.string().max(100).required(),
  land_area_acres: Joi.number().positive().required(),
  primary_crop: Joi.string().max(100).required(),
  secondary_crop: Joi.string().max(100).allow(null, ""),
  soil_type: Joi.string().valid("sandy", "clay", "loam", "black_cotton").required(),
  irrigation_type: Joi.string().valid("rainfed", "canal", "borewell", "drip").required(),
  annual_income_inr: Joi.number().integer().min(0).required(),
  family_size: Joi.number().integer().min(1).required(),
  loan_amount_inr: Joi.number().integer().min(0).allow(null),
  loan_type: Joi.string().valid("kcc", "term_loan", "none").required(),
  loan_due_date: Joi.date().iso().allow(null),
  last_repayment_date: Joi.date().iso().allow(null),
  has_crop_insurance: Joi.boolean().required(),
  insurance_expiry_date: Joi.date().iso().allow(null),
  pm_kisan_enrolled: Joi.boolean().required(),
  pm_kisan_last_installment_date: Joi.date().iso().allow(null),
  bank_account_number: Joi.string().max(50).allow(null, ""),
  preferred_language: Joi.string().valid("en", "hi", "gu").required(),
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null)
};

const createFarmerSchema = Joi.object(baseFarmerFields);

const updateFarmerSchema = Joi.object({
  name: Joi.string().min(2).max(120),
  phone: Joi.string().min(10).max(20),
  aadhaar_last4: Joi.string().pattern(/^\d{4}$/),
  district: Joi.string().max(100),
  taluka: Joi.string().max(100),
  village: Joi.string().max(100),
  state: Joi.string().max(100),
  land_area_acres: Joi.number().positive(),
  primary_crop: Joi.string().max(100),
  secondary_crop: Joi.string().max(100).allow(null, ""),
  soil_type: Joi.string().valid("sandy", "clay", "loam", "black_cotton"),
  irrigation_type: Joi.string().valid("rainfed", "canal", "borewell", "drip"),
  annual_income_inr: Joi.number().integer().min(0),
  family_size: Joi.number().integer().min(1),
  loan_amount_inr: Joi.number().integer().min(0).allow(null),
  loan_type: Joi.string().valid("kcc", "term_loan", "none"),
  loan_due_date: Joi.date().iso().allow(null),
  last_repayment_date: Joi.date().iso().allow(null),
  has_crop_insurance: Joi.boolean(),
  insurance_expiry_date: Joi.date().iso().allow(null),
  pm_kisan_enrolled: Joi.boolean(),
  pm_kisan_last_installment_date: Joi.date().iso().allow(null),
  bank_account_number: Joi.string().max(50).allow(null, ""),
  preferred_language: Joi.string().valid("en", "hi", "gu"),
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null)
}).min(1);

const listFarmersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  district: Joi.string().max(100),
  taluka: Joi.string().max(100),
  vulnerability_label: Joi.string().valid("low", "medium", "high", "critical"),
  primary_crop: Joi.string().max(100),
  loan_type: Joi.string().valid("kcc", "term_loan", "none"),
  has_crop_insurance: Joi.boolean(),
  search: Joi.string().max(100)
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

module.exports = {
  createFarmerSchema,
  updateFarmerSchema,
  listFarmersQuerySchema,
  idParamSchema
};
