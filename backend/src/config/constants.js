const ROLES = {
  SUPERADMIN: "superadmin",
  ORG_ADMIN: "org_admin",
  FIELD_OFFICER: "field_officer"
};

const ROLE_LEVELS = {
  [ROLES.FIELD_OFFICER]: 1,
  [ROLES.ORG_ADMIN]: 2,
  [ROLES.SUPERADMIN]: 3
};

const SCORE_LABELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical"
};

const DROUGHT_SCORE_MAP = {
  none: 0,
  low: 5,
  moderate: 12,
  high: 20,
  severe: 25
};

const SCORE_THRESHOLDS = {
  LOW_MAX: 25,
  MEDIUM_MAX: 50,
  HIGH_MAX: 75
};

const ALERT_PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent"
};

const GOVERNMENT_SCHEMES = [
  {
    name: "PM-KISAN",
    short_code: "PM_KISAN",
    description: "Income support of INR 6000 per year for eligible farmer families.",
    eligibility_rules: {
      land_area_acres_max: 5,
      requires_bank_account: true
    },
    benefit_amount_inr: 6000,
    benefit_type: "cash",
    application_url: "https://pmkisan.gov.in/"
  },
  {
    name: "Pradhan Mantri Fasal Bima Yojana",
    short_code: "PMFBY",
    description: "Crop insurance support for notified crops.",
    eligibility_rules: {
      requires_notified_crop: true,
      requires_not_insured: true
    },
    benefit_amount_inr: null,
    benefit_type: "insurance",
    application_url: "https://pmfby.gov.in/"
  },
  {
    name: "Kisan Credit Card",
    short_code: "KCC",
    description: "Revolving agriculture credit up to INR 300000.",
    eligibility_rules: {
      requires_land_ownership: true,
      no_existing_kcc: true,
      annual_income_max: 300000
    },
    benefit_amount_inr: 300000,
    benefit_type: "credit",
    application_url: "https://www.myscheme.gov.in/schemes/kcc"
  },
  {
    name: "National Rural Livelihoods Mission",
    short_code: "NRLM",
    description: "Livelihood support for low-income rural households.",
    eligibility_rules: {
      annual_income_max: 100000,
      family_size_min: 3
    },
    benefit_amount_inr: null,
    benefit_type: "subsidy",
    application_url: "https://aajeevika.gov.in/"
  },
  {
    name: "Soil Health Card",
    short_code: "SHC",
    description: "Free soil testing and soil health advisory.",
    eligibility_rules: {
      any_farmer: true
    },
    benefit_amount_inr: null,
    benefit_type: "subsidy",
    application_url: "https://soilhealth.dac.gov.in/"
  },
  {
    name: "PM Kisan Mandhan Yojana",
    short_code: "PMKMY",
    description: "Pension scheme for small and marginal farmers.",
    eligibility_rules: {
      land_area_acres_max: 2,
      assumed_age_range: "18-40"
    },
    benefit_amount_inr: null,
    benefit_type: "cash",
    application_url: "https://maandhan.in/"
  }
];

function scopeToOrg(baseSql, hasWhere, paramIndex) {
  const clause = `organization_id = $${paramIndex}`;
  return hasWhere ? `${baseSql} AND ${clause}` : `${baseSql} WHERE ${clause}`;
}

module.exports = {
  ROLES,
  ROLE_LEVELS,
  SCORE_LABELS,
  DROUGHT_SCORE_MAP,
  SCORE_THRESHOLDS,
  ALERT_PRIORITIES,
  GOVERNMENT_SCHEMES,
  scopeToOrg
};
