const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { pool } = require("../config/db");
const { GOVERNMENT_SCHEMES } = require("../config/constants");

dotenv.config();

const farmerNames = [
  "Ramesh Patel", "Suresh Patel", "Mahesh Patel", "Dineshbhai Patel", "Bhupatbhai Patel",
  "Kiritbhai Patel", "Nilesh Patel", "Jayesh Patel", "Prakash Patel", "Hitesh Patel",
  "Kalpesh Patel", "Vishal Patel", "Harshad Patel", "Ratilal Patel", "Mansukh Patel",
  "Arvind Patel", "Girish Patel", "Paresh Patel", "Jignesh Patel", "Sanjay Patel",
  "Bharatbhai Solanki", "Ishwarbhai Solanki", "Raju Solanki", "Ganesh Solanki", "Mukesh Solanki",
  "Ramanbhai Chauhan", "Alpesh Chauhan", "Bhavesh Chauhan", "Dilip Chauhan", "Rohit Chauhan",
  "Hasmukhbhai Parmar", "Kamal Parmar", "Piyush Parmar", "Ravindra Parmar", "Haribhai Parmar",
  "Devjibhai Rabari", "Karsanbhai Rabari", "Gopal Rabari", "Shailesh Rabari", "Yogesh Rabari",
  "Naranbhai Thakor", "Ajit Thakor", "Bhagirath Thakor", "Manubhai Thakor", "Pravin Thakor",
  "Dahya Patel", "Jitendra Patel", "Vikram Patel", "Ashok Patel", "Tushar Patel"
];

const crops = ["wheat", "cotton", "groundnut", "bajra", "castor"];
const soilTypes = ["sandy", "clay", "loam", "black_cotton"];
const irrigationTypes = ["rainfed", "canal", "borewell", "drip"];
const loanTypes = ["kcc", "term_loan", "none"];

function scoreToLabel(score) {
  if (score <= 25) return "low";
  if (score <= 50) return "medium";
  if (score <= 75) return "high";
  return "critical";
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orgId = uuidv4();
    await client.query(
      `INSERT INTO organizations (id, name, type, district, state, contact_email, contact_phone, subscription_tier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [
        orgId,
        "Anand Cooperative Bank",
        "bank",
        "Anand",
        "Gujarat",
        "contact@anandcoopbank.in",
        "+919876543210",
        "pro"
      ]
    );

    const superAdminId = uuidv4();
    const orgAdminId = uuidv4();

    const adminPassword = await bcrypt.hash("Admin@1234", 12);

    await client.query(
      `INSERT INTO users (id, organization_id, name, email, password_hash, role, preferred_language)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO NOTHING`,
      [superAdminId, orgId, "Platform Superadmin", "superadmin@graamai.com", adminPassword, "superadmin", "en"]
    );

    await client.query(
      `INSERT INTO users (id, organization_id, name, email, password_hash, role, preferred_language)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO NOTHING`,
      [orgAdminId, orgId, "Anand Org Admin", "orgadmin@anandcoopbank.in", adminPassword, "org_admin", "gu"]
    );

    for (const scheme of GOVERNMENT_SCHEMES) {
      await client.query(
        `INSERT INTO government_schemes (
          id, name, short_code, description, eligibility_rules,
          benefit_amount_inr, benefit_type, application_url, is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
        ON CONFLICT (short_code)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          eligibility_rules = EXCLUDED.eligibility_rules,
          benefit_amount_inr = EXCLUDED.benefit_amount_inr,
          benefit_type = EXCLUDED.benefit_type,
          application_url = EXCLUDED.application_url,
          updated_at = NOW()`,
        [
          uuidv4(),
          scheme.name,
          scheme.short_code,
          scheme.description,
          JSON.stringify(scheme.eligibility_rules),
          scheme.benefit_amount_inr,
          scheme.benefit_type,
          scheme.application_url
        ]
      );
    }

    for (let i = 0; i < 50; i += 1) {
      const id = uuidv4();
      const hasInsurance = i % 3 !== 0;
      const pmKisan = i % 4 !== 0;
      const loanType = pick(loanTypes);
      const score = rand(8, 95);
      const label = scoreToLabel(score);
      const crop = pick(crops);
      const secondaryCrop = i % 2 === 0 ? pick(crops.filter((c) => c !== crop)) : null;
      const land = Number((Math.random() * 7 + 0.6).toFixed(2));
      const income = rand(45000, 240000);
      const loanDueDate = loanType === "none" ? null : new Date(Date.now() - rand(-40, 120) * 24 * 60 * 60 * 1000);
      const insuranceExpiryDate = hasInsurance
        ? new Date(Date.now() + rand(-15, 90) * 24 * 60 * 60 * 1000)
        : null;
      const pmDate = pmKisan ? new Date(Date.now() - rand(20, 220) * 24 * 60 * 60 * 1000) : null;

      await client.query(
        `INSERT INTO farmers (
          id, organization_id, name, phone, aadhaar_last4, district, taluka, village, state,
          land_area_acres, primary_crop, secondary_crop, soil_type, irrigation_type,
          annual_income_inr, family_size, loan_amount_inr, loan_type, loan_due_date, last_repayment_date,
          has_crop_insurance, insurance_expiry_date, pm_kisan_enrolled, pm_kisan_last_installment_date,
          bank_account_number, preferred_language, latitude, longitude,
          vulnerability_score, vulnerability_label, score_last_calculated_at, created_by
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,
          $25,$26,$27,$28,
          $29,$30,NOW(),$31
        )`,
        [
          id,
          orgId,
          farmerNames[i],
          `+9199${String(10000000 + i).slice(-8)}`,
          String(rand(1000, 9999)),
          "Anand",
          i % 2 === 0 ? "Anand" : "Umreth",
          `Village-${(i % 12) + 1}`,
          "Gujarat",
          land,
          crop,
          secondaryCrop,
          pick(soilTypes),
          pick(irrigationTypes),
          income,
          rand(2, 8),
          loanType === "none" ? null : rand(20000, 220000),
          loanType,
          loanDueDate,
          loanDueDate && i % 3 === 0 ? new Date(loanDueDate.getTime() - rand(1, 40) * 24 * 60 * 60 * 1000) : null,
          hasInsurance,
          insuranceExpiryDate,
          pmKisan,
          pmDate,
          i % 5 === 0 ? null : `1199${String(100000 + i)}`,
          i % 3 === 0 ? "hi" : "gu",
          Number((22.5 + Math.random() * 0.8).toFixed(6)),
          Number((72.85 + Math.random() * 0.8).toFixed(6)),
          score,
          label,
          orgAdminId
        ]
      );

      await client.query(
        `INSERT INTO vulnerability_score_history (id, farmer_id, score, label, score_breakdown, triggered_by)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          uuidv4(),
          id,
          score,
          label,
          {
            droughtRisk: rand(0, 25),
            loanOverdueRisk: rand(0, 20),
            insuranceStatus: rand(0, 15),
            pmKisanMissedInstallment: rand(0, 10),
            incomeVulnerability: rand(0, 15),
            landAreaRisk: rand(0, 10),
            cropMonocultureRisk: rand(0, 5)
          },
          "on_create"
        ]
      );
    }

    await client.query("COMMIT");
    // eslint-disable-next-line no-console
    console.log("Seed completed successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    // eslint-disable-next-line no-console
    console.error("Seed failed", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
