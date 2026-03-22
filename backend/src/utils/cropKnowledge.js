// Complete crop knowledge for Gujarat's major crops
const CROP_KNOWLEDGE = {
  wheat: {
    gujarati_name: "ઘઉં",
    season: "rabi",
    sowing_months: [11, 12], // Nov-Dec
    harvest_months: [3, 4], // Mar-Apr
    growth_stages: [
      { days: "0-21", stage: "germination", gujarati: "અંકુરણ" },
      { days: "21-45", stage: "tillering", gujarati: "ફૂટ" },
      { days: "45-75", stage: "stem_extension", gujarati: "ડાળ વધારો" },
      { days: "75-100", stage: "heading", gujarati: "સૂળ" },
      { days: "100-120", stage: "grain_filling", gujarati: "દાણા ભરવા" },
      { days: "120-135", stage: "maturity", gujarati: "પાક" }
    ],
    diseases: [
      {
        name: "Yellow Rust",
        gujarati: "પીળો ઘઉ",
        trigger_temp: [10, 15],
        trigger_humidity: 80,
        symptoms: "Yellow stripes on leaves",
        treatment: "Propiconazole 25 EC @ 1ml/L spray",
        prevention: "Rust resistant varieties, timely sowing"
      },
      {
        name: "Powdery Mildew",
        gujarati: "ભૂકી ચૂકી",
        trigger_temp: [15, 20],
        trigger_humidity: 70,
        symptoms: "White powder on leaves",
        treatment: "Sulfur dust 25kg/hectare OR Karathane spray",
        prevention: "Avoid excess nitrogen, ensure airflow"
      },
      {
        name: "Karnal Bunt",
        gujarati: "કાર્નલ બંટ",
        trigger_temp: [18, 22],
        trigger_humidity: 90,
        symptoms: "Black powder in grain, fishy smell",
        treatment: "Seed treatment with Thiram 75% WS",
        prevention: "Certified disease-free seeds only"
      }
    ],
    pests: [
      {
        name: "Aphid",
        gujarati: "મા (ઊડ)",
        trigger_temp: [15, 25],
        trigger_humidity: 60,
        treatment: "Imidacloprid 17.8 SL @ 0.3ml/L",
        economic_threshold: "50 aphids per tiller"
      },
      {
        name: "Army Worm",
        gujarati: "ફોજી ઈયળ",
        season_risk: [2, 3],
        treatment: "Quinalphos 25 EC @ 2ml/L"
      }
    ],
    soil_requirements: {
      sandy: "Needs more frequent irrigation, apply organic matter",
      clay: "Good water retention, risk of waterlogging in rain",
      loam: "Ideal for wheat, standard practices apply",
      black_cotton: "Excellent for wheat, avoid sowing in wet soil"
    },
    water_stress_signs: "Leaf rolling, blue-green color, reduced tillering",
    optimal_irrigation_days: [21, 42, 60, 90], // DAS (days after sowing)
    fertilizer_schedule: [
      { das: 0, type: "Basal", dose: "DAP 2 bags + Urea 1 bag per acre" },
      { das: 21, type: "Top dress", dose: "Urea 1 bag per acre" },
      { das: 45, type: "Top dress", dose: "Urea 0.5 bag per acre if needed" }
    ]
  },

  cotton: {
    gujarati_name: "કપાસ",
    season: "kharif",
    sowing_months: [5, 6],
    harvest_months: [10, 11, 12],
    growth_stages: [
      { days: "0-30", stage: "seedling", gujarati: "રોપ" },
      { days: "30-60", stage: "squaring", gujarati: "ફૂલ કળી" },
      { days: "60-90", stage: "flowering", gujarati: "ફૂલ" },
      { days: "90-130", stage: "boll_formation", gujarati: "જીંડવા" },
      { days: "130-180", stage: "boll_opening", gujarati: "ફૂટ" }
    ],
    diseases: [
      {
        name: "Pink Bollworm",
        gujarati: "ગુલાબી ઈયળ",
        trigger_temp: [25, 35],
        trigger_humidity: 60,
        symptoms: "Rosette flowers, damaged bolls with pink larvae inside",
        treatment: "Spinosad 45 SC @ 0.3ml/L, Pheromone traps",
        prevention: "Early sowing, Bt cotton varieties, destroy crop residue"
      },
      {
        name: "Whitefly",
        gujarati: "સફેદ માખી",
        trigger_temp: [30, 38],
        trigger_humidity: 50,
        symptoms: "Yellow leaves, sticky honeydew, sooty mold",
        treatment: "Thiamethoxam 25 WG @ 0.2g/L OR Spiromesifen",
        prevention: "Yellow sticky traps, neem oil spray early"
      },
      {
        name: "Root Rot",
        gujarati: "મૂળ સડો",
        trigger_condition: "waterlogging + high temperature",
        symptoms: "Wilting, brown roots, plant death",
        treatment: "Improve drainage, Metalaxyl + Mancozeb drench",
        prevention: "Avoid waterlogging, raised bed planting"
      }
    ],
    pests: [
      {
        name: "Thrips",
        gujarati: "થ્રીપ્સ",
        trigger_temp: [30, 40],
        dry_weather: true,
        treatment: "Spinosad OR Imidacloprid spray"
      },
      {
        name: "Mealybug",
        gujarati: "ઢીંક",
        season_risk: [8, 9, 10],
        treatment: "Profenophos 50 EC @ 2ml/L, remove affected plants"
      }
    ],
    soil_requirements: {
      sandy: "Poor — needs heavy organic matter, frequent fertigation",
      clay: "Moderate — drainage critical, avoid waterlogging",
      loam: "Good — standard practices",
      black_cotton: "BEST — natural choice for cotton in Gujarat"
    },
    optimal_irrigation_days: [0, 15, 30, 45, 65, 85, 105],
    fertilizer_schedule: [
      { das: 0, type: "Basal", dose: "SSP 50kg + DAP 25kg per acre" },
      { das: 30, type: "Top dress", dose: "Urea 25kg per acre" },
      { das: 60, type: "Top dress", dose: "Urea 25kg + Potash 10kg per acre" },
      { das: 90, type: "Micronutrient", dose: "Boron spray 0.2% for boll setting" }
    ]
  },

  groundnut: {
    gujarati_name: "મગફળી",
    season: "kharif",
    sowing_months: [6, 7],
    harvest_months: [10, 11],
    growth_stages: [
      { days: "0-30", stage: "seedling", gujarati: "રોપ" },
      { days: "30-50", stage: "pegging", gujarati: "ખીલવા" },
      { days: "50-80", stage: "pod_filling", gujarati: "જીંડવા" },
      { days: "80-130", stage: "maturity", gujarati: "પાક" }
    ],
    diseases: [
      {
        name: "Tikka Disease (Leaf Spot)",
        gujarati: "ટીક્કા રોગ",
        trigger_temp: [25, 30],
        trigger_humidity: 85,
        symptoms: "Brown circular spots on leaves with yellow halo",
        treatment: "Chlorothalonil 75 WP @ 2g/L spray every 10 days",
        prevention: "Crop rotation, remove infected leaves"
      },
      {
        name: "Stem Rot",
        gujarati: "ડૂંખ સડો",
        trigger_condition: "high humidity + poor drainage",
        symptoms: "White fungal growth at stem base, plant wilts and dies",
        treatment: "Drench with Carbendazim 50 WP @ 1g/L",
        prevention: "Seed treatment, proper drainage, crop rotation"
      },
      {
        name: "Aflatoxin Risk",
        gujarati: "ઉણાળો ઝેર",
        trigger_condition: "drought stress at pod filling + warm weather",
        symptoms: "Invisible — affects stored pods",
        treatment: "Harvest at right time, dry to <9% moisture immediately",
        prevention: "Avoid drought stress at pod filling, proper storage"
      }
    ],
    pests: [
      {
        name: "Pod Borer",
        gujarati: "જીંડવા ખાનારો",
        trigger_temp: [25, 35],
        treatment: "Carbaryl 50 WP @ 2g/L OR Endosulfan spray"
      }
    ],
    soil_requirements: {
      sandy: "BEST — pod development excellent, ensure calcium",
      clay: "Poor — pods cannot develop, avoid",
      loam: "Good — add gypsum at pegging",
      black_cotton: "Poor — waterlogging risk, use on light black cotton only"
    },
    water_stress_signs: "Leaf wilting, reduced pod formation",
    optimal_irrigation_days: [0, 25, 45, 65, 80], // critical at pegging + pod filling
    fertilizer_schedule: [
      { das: 0, type: "Basal", dose: "SSP 2 bags + Urea 10kg per acre" },
      { das: 30, type: "Gypsum", dose: "100kg per acre at pegging — CRITICAL" },
      { das: 45, type: "Micronutrient", dose: "Boron 0.1% spray" }
    ]
  },

  bajra: {
    gujarati_name: "બાજરો",
    season: "kharif",
    sowing_months: [6, 7],
    harvest_months: [9, 10],
    growth_stages: [
      { days: "0-20", stage: "seedling", gujarati: "રોપ" },
      { days: "20-40", stage: "active_growth", gujarati: "વર્ધન" },
      { days: "40-60", stage: "flowering", gujarati: "ફૂલ" },
      { days: "60-80", stage: "grain_filling", gujarati: "દાણા ભરવા" },
      { days: "80-90", stage: "maturity", gujarati: "પાક" }
    ],
    diseases: [
      {
        name: "Downy Mildew",
        gujarati: "ખડી",
        trigger_temp: [20, 30],
        trigger_humidity: 80,
        symptoms: "Yellow striping on leaves, green ear",
        treatment: "Metalaxyl seed treatment, Ridomil spray",
        prevention: "Resistant varieties, treat seeds before sowing"
      },
      {
        name: "Ergot",
        gujarati: "ઘૂળ",
        trigger_condition: "cool cloudy weather at flowering",
        symptoms: "Honey dew secretion from florets, black sclerotia",
        treatment: "Remove affected heads, spray Mancozeb",
        prevention: "Roguing, avoid dense sowing"
      }
    ],
    pests: [],
    soil_requirements: {
      sandy: "BEST — most drought tolerant crop for sandy soil",
      clay: "Poor drainage risk, raised beds recommended",
      loam: "Good",
      black_cotton: "Good in dry year, waterlogging risk in heavy rain"
    },
    optimal_irrigation_days: [21, 42, 60],
    fertilizer_schedule: [
      { das: 0, type: "Basal", dose: "DAP 1 bag per acre" },
      { das: 25, type: "Top dress", dose: "Urea 0.5 bag per acre" }
    ]
  },

  castor: {
    gujarati_name: "દિવેળ / એરંડો",
    season: "kharif",
    sowing_months: [6, 7],
    harvest_months: [11, 12, 1],
    growth_stages: [
      { days: "0-40", stage: "vegetative", gujarati: "વર્ધન" },
      { days: "40-90", stage: "flowering", gujarati: "ફૂલ" },
      { days: "90-150", stage: "seed_maturation", gujarati: "બીજ પાક" }
    ],
    diseases: [
      {
        name: "Wilt",
        gujarati: "કરમાવ",
        trigger_condition: "soil borne, worsened by waterlogging",
        symptoms: "Sudden wilting, brown vascular tissue",
        treatment: "No cure — remove plant, drench soil with Copper Oxychloride",
        prevention: "Seed treatment, crop rotation, drainage"
      },
      {
        name: "Grey Mould",
        gujarati: "ભૂખરી ફૂગ",
        trigger_humidity: 85,
        symptoms: "Grey powder on spikes, capsule rot",
        treatment: "Carbendazim 50 WP spray"
      }
    ],
    pests: [],
    soil_requirements: {
      sandy: "Moderate — drought tolerant but needs some moisture",
      clay: "Poor drainage is main risk",
      loam: "Good",
      black_cotton: "Excellent if drainage is good"
    },
    optimal_irrigation_days: [0, 30, 60, 90],
    fertilizer_schedule: [
      { das: 0, type: "Basal", dose: "SSP 1 bag + Urea 10kg per acre" },
      { das: 45, type: "Top dress", dose: "Urea 15kg per acre" }
    ]
  }
};

// Season detection based on current month
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 6 && month <= 10) return "kharif";
  if (month >= 11 || month <= 3) return "rabi";
  return "zaid"; // summer
}

// Get current crop growth stage based on sowing date
function getCropGrowthStage(crop, sowingDate) {
  if (!sowingDate) return null;
  const cropInfo = CROP_KNOWLEDGE[crop?.toLowerCase()];
  if (!cropInfo?.growth_stages) return null;

  const das = Math.floor((new Date() - new Date(sowingDate)) / 86400000);

  for (const stage of cropInfo.growth_stages) {
    const [min, max] = stage.days.split("-").map(Number);
    if (das >= min && das <= max) {
      return { ...stage, das };
    }
  }
  return null;
}

// Get diseases relevant to current weather conditions
function getWeatherTriggeredDiseases(crop, temperature, humidity, rainfall) {
  const cropInfo = CROP_KNOWLEDGE[crop?.toLowerCase()];
  if (!cropInfo) return [];

  const relevantDiseases = [];

  for (const disease of cropInfo.diseases || []) {
    let riskScore = 0;

    if (disease.trigger_temp) {
      const [minT, maxT] = disease.trigger_temp;
      if (temperature >= minT && temperature <= maxT) riskScore += 40;
    }

    if (disease.trigger_humidity && humidity >= disease.trigger_humidity) {
      riskScore += 40;
    }

    if (disease.trigger_condition) {
      if (disease.trigger_condition.includes("waterlogging") && rainfall > 50) riskScore += 30;
      if (disease.trigger_condition.includes("drought") && rainfall < 5) riskScore += 30;
      if (disease.trigger_condition.includes("dry") && humidity < 40) riskScore += 20;
    }

    if (riskScore >= 40) {
      relevantDiseases.push({ ...disease, riskScore });
    }
  }

  return relevantDiseases.sort((a, b) => b.riskScore - a.riskScore);
}

// Get pests relevant to current conditions
function getWeatherTriggeredPests(crop, temperature, humidity, month) {
  const cropInfo = CROP_KNOWLEDGE[crop?.toLowerCase()];
  if (!cropInfo) return [];

  return (cropInfo.pests || []).filter((pest) => {
    if (pest.trigger_temp) {
      const [min, max] = pest.trigger_temp;
      if (temperature < min || temperature > max) return false;
    }
    if (pest.season_risk && !pest.season_risk.includes(month)) return false;
    if (pest.dry_weather && humidity > 60) return false;
    return true;
  });
}

module.exports = {
  CROP_KNOWLEDGE,
  getCurrentSeason,
  getCropGrowthStage,
  getWeatherTriggeredDiseases,
  getWeatherTriggeredPests
};
