const { v4: uuidv4 } = require("uuid");
const { pool } = require("../../config/db");

const axios = require("axios");
const FormData = require("form-data");

async function listDiseaseRecords(farmerId) {
  let sql = "SELECT * FROM disease_records";
  let values = [];
  if (farmerId) {
    sql += " WHERE farmer_id = $1";
    values.push(farmerId);
  }
  sql += " ORDER BY detected_at DESC";
  const { rows } = await pool.query(sql, values);
  return rows;
}

async function createDiseaseRecord(payload) {
  const id = uuidv4();
  const sql = `
    INSERT INTO disease_records (
      id, farmer_id, crop_id, disease_name, severity, status, confidence, image_url, detected_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *
  `;
  const values = [
    id, payload.farmer_id, payload.crop_id, payload.disease_name,
    payload.severity, payload.status || "DETECTED", payload.confidence, payload.image_url
  ];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function detectDiseaseFromUrl(imageUrl) {
  try {
    // 1. Download image
    console.log("Downloading image from Telegram:", imageUrl);
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    console.log("Image downloaded, buffer length:", buffer.length);

    // 2. Prepare FormData
    const form = new FormData();
    form.append("file", buffer, { filename: "image.jpg", contentType: "image/jpeg" });

    // 3. Call Python API
    const pythonApiUrl = process.env.PYTHON_API_URL || "http://127.0.0.1:8000";
    console.log("Forwarding to Python API at:", `${pythonApiUrl}/predict`);
    
    const res = await axios.post(`${pythonApiUrl}/predict`, form, {
      headers: {
        ...form.getHeaders()
      }
    });
    console.log("Python API Response:", res.data);

    if (res.data.detected_issue && res.data.advice) {
      return {
        reasoned_text: res.data.reasoned_text,
        detected_issue: res.data.detected_issue,
        advice: res.data.advice,
        full_result: `🚩 **Issue**: ${res.data.detected_issue}\n💡 **Advice**: ${res.data.advice}\n\n📝 **Detail**: ${res.data.reasoned_text}`
      };
    }

    return {
      advice: res.data.result || res.data.error || "Could not determine disease.",
      full_result: res.data.result || res.data.error || "Could not determine disease."
    };
  } catch (error) {
    if (error.response) {
      console.error("Python API Error Status:", error.response.status);
      console.error("Python API Error Data:", error.response.data);
    } else if (error.code) {
      console.error("Connection Error Code:", error.code);
      console.error("Connection Error Message:", error.message);
    } else {
      console.error("Unexpected Error in disease detection flow:", error);
    }
    return {
      advice: "Possible fungal disease detected. Apply fungicide and monitor crop. (Fallback)"
    };
  }
}

module.exports = {
  listDiseaseRecords,
  createDiseaseRecord,
  detectDiseaseFromUrl
};
