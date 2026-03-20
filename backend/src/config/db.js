const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_SSL === "true" || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("neon.tech")) ? { rejectUnauthorized: false } : false
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected postgres client error", err);
});

module.exports = { pool };
