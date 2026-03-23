const ALERT_TYPES = {
  // Existing
  INSURANCE_EXPIRY:      "insurance_expiry",
  LOAN_OVERDUE:          "loan_overdue",
  PM_KISAN_PENDING:      "pm_kisan_pending",
  SCHEME_OPPORTUNITY:    "scheme_opportunity",
  SCORE_CHANGE:          "score_change",
  OFFICER_CALLBACK:      "officer_callback",
  CUSTOM:                "custom",
  WEATHER_RISK:          "weather_risk",

  // NEW — intelligent alerts
  CROP_DISEASE_RISK:     "crop_disease_risk",    // disease likely based on weather+crop
  WEATHER_EXTREME:       "weather_extreme",       // flood, drought, heatwave, frost
  SOIL_HEALTH:           "soil_health",           // soil needs treatment based on type+crop
  PEST_OUTBREAK:         "pest_outbreak",         // pest risk based on season+crop+weather
  HARVEST_ADVISORY:      "harvest_advisory",      // optimal harvest timing alert
  MARKET_PRICE:          "market_price",          // crop price movement advisory
  VULNERABILITY_SPIKE:   "vulnerability_spike",   // score crossed critical threshold
  IRRIGATION_ADVISORY:   "irrigation_advisory",   // irrigation advice based on weather+soil
  FERTILIZER_ADVISORY:   "fertilizer_advisory",   // fertilizer timing based on crop stage
  SOWING_ADVISORY:       "sowing_advisory",       // optimal sowing window alert
};

const ALERT_DOMAINS = {
  FINANCIAL: "financial",
  AGRICULTURE: "agriculture"
};

const ALERT_TYPE_DOMAIN_MAP = {
  [ALERT_TYPES.INSURANCE_EXPIRY]: ALERT_DOMAINS.FINANCIAL,
  [ALERT_TYPES.LOAN_OVERDUE]: ALERT_DOMAINS.FINANCIAL,
  [ALERT_TYPES.PM_KISAN_PENDING]: ALERT_DOMAINS.FINANCIAL,
  [ALERT_TYPES.SCHEME_OPPORTUNITY]: ALERT_DOMAINS.FINANCIAL,
  [ALERT_TYPES.SCORE_CHANGE]: ALERT_DOMAINS.FINANCIAL,
  [ALERT_TYPES.OFFICER_CALLBACK]: ALERT_DOMAINS.FINANCIAL,
  [ALERT_TYPES.VULNERABILITY_SPIKE]: ALERT_DOMAINS.FINANCIAL,
  [ALERT_TYPES.MARKET_PRICE]: ALERT_DOMAINS.FINANCIAL,

  [ALERT_TYPES.CUSTOM]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.WEATHER_RISK]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.CROP_DISEASE_RISK]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.WEATHER_EXTREME]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.SOIL_HEALTH]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.PEST_OUTBREAK]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.HARVEST_ADVISORY]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.IRRIGATION_ADVISORY]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.FERTILIZER_ADVISORY]: ALERT_DOMAINS.AGRICULTURE,
  [ALERT_TYPES.SOWING_ADVISORY]: ALERT_DOMAINS.AGRICULTURE,
};

function getAlertDomain(alertType) {
  return ALERT_TYPE_DOMAIN_MAP[alertType] || ALERT_DOMAINS.AGRICULTURE;
}

function getAlertDomainLabel(alertType) {
  const domain = getAlertDomain(alertType);
  return domain === ALERT_DOMAINS.FINANCIAL
    ? "[FINANCIAL ALERT]"
    : "[AGRICULTURE ALERT]";
}

function prependAlertDomainLabel(message, alertType) {
  const content = String(message || "").trim();
  if (!content) return content;

  const label = getAlertDomainLabel(alertType);
  if (content.startsWith("[FINANCIAL ALERT]") || content.startsWith("[AGRICULTURE ALERT]")) {
    return content;
  }

  return `${label}\n${content}`;
}

const ALERT_TYPES_BY_DOMAIN = {
  [ALERT_DOMAINS.FINANCIAL]: Object.keys(ALERT_TYPE_DOMAIN_MAP).filter(
    (type) => ALERT_TYPE_DOMAIN_MAP[type] === ALERT_DOMAINS.FINANCIAL
  ),
  [ALERT_DOMAINS.AGRICULTURE]: Object.keys(ALERT_TYPE_DOMAIN_MAP).filter(
    (type) => ALERT_TYPE_DOMAIN_MAP[type] === ALERT_DOMAINS.AGRICULTURE
  )
};

const ALERT_PRIORITIES = {
  URGENT: "urgent",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low"
};

const ALERT_PRIORITY_MAP = {
  [ALERT_TYPES.SCORE_CHANGE]:        ALERT_PRIORITIES.URGENT,
  [ALERT_TYPES.LOAN_OVERDUE]:        ALERT_PRIORITIES.URGENT,
  [ALERT_TYPES.INSURANCE_EXPIRY]:    ALERT_PRIORITIES.HIGH,
  [ALERT_TYPES.PM_KISAN_PENDING]:    ALERT_PRIORITIES.MEDIUM,
  [ALERT_TYPES.WEATHER_RISK]:        ALERT_PRIORITIES.HIGH,
  [ALERT_TYPES.SCHEME_OPPORTUNITY]:  ALERT_PRIORITIES.MEDIUM,
  [ALERT_TYPES.OFFICER_CALLBACK]:    ALERT_PRIORITIES.HIGH,
  [ALERT_TYPES.CUSTOM]:              ALERT_PRIORITIES.LOW,
  [ALERT_TYPES.CROP_DISEASE_RISK]:   ALERT_PRIORITIES.URGENT,
  [ALERT_TYPES.WEATHER_EXTREME]:     ALERT_PRIORITIES.URGENT,
  [ALERT_TYPES.SOIL_HEALTH]:         ALERT_PRIORITIES.MEDIUM,
  [ALERT_TYPES.PEST_OUTBREAK]:       ALERT_PRIORITIES.URGENT,
  [ALERT_TYPES.HARVEST_ADVISORY]:    ALERT_PRIORITIES.HIGH,
  [ALERT_TYPES.MARKET_PRICE]:        ALERT_PRIORITIES.MEDIUM,
  [ALERT_TYPES.VULNERABILITY_SPIKE]: ALERT_PRIORITIES.URGENT,
  [ALERT_TYPES.IRRIGATION_ADVISORY]: ALERT_PRIORITIES.MEDIUM,
  [ALERT_TYPES.FERTILIZER_ADVISORY]: ALERT_PRIORITIES.MEDIUM,
  [ALERT_TYPES.SOWING_ADVISORY]:     ALERT_PRIORITIES.MEDIUM,
};

const ALERT_DEDUP_WINDOWS = {
  [ALERT_TYPES.SCORE_CHANGE]:        "24 hours",
  [ALERT_TYPES.LOAN_OVERDUE]:        "7 days",
  [ALERT_TYPES.INSURANCE_EXPIRY]:    "3 days",
  [ALERT_TYPES.PM_KISAN_PENDING]:    "14 days",
  [ALERT_TYPES.WEATHER_RISK]:        "6 hours",
  [ALERT_TYPES.SCHEME_OPPORTUNITY]:  "7 days",
  [ALERT_TYPES.OFFICER_CALLBACK]:    "24 hours",
  [ALERT_TYPES.CUSTOM]:              "24 hours",
  [ALERT_TYPES.CROP_DISEASE_RISK]:   "3 days",
  [ALERT_TYPES.WEATHER_EXTREME]:     "1 day",
  [ALERT_TYPES.SOIL_HEALTH]:         "30 days",
  [ALERT_TYPES.PEST_OUTBREAK]:       "3 days",
  [ALERT_TYPES.HARVEST_ADVISORY]:    "5 days",
  [ALERT_TYPES.MARKET_PRICE]:        "1 day",
  [ALERT_TYPES.VULNERABILITY_SPIKE]: "3 days",
  [ALERT_TYPES.IRRIGATION_ADVISORY]: "5 days",
  [ALERT_TYPES.FERTILIZER_ADVISORY]: "7 days",
  [ALERT_TYPES.SOWING_ADVISORY]:     "14 days",
};

module.exports = {
  ALERT_TYPES,
  ALERT_DOMAINS,
  ALERT_TYPE_DOMAIN_MAP,
  ALERT_TYPES_BY_DOMAIN,
  getAlertDomain,
  getAlertDomainLabel,
  prependAlertDomainLabel,
  ALERT_PRIORITIES,
  ALERT_PRIORITY_MAP,
  ALERT_DEDUP_WINDOWS
};
