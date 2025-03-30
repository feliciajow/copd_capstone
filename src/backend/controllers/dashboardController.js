const axios = require("axios");
const { getDiagnosticCodes } = require("../utils/diagnosticUtils");
const pool = require("../utils/database");

// Fetch diagnostic codes
async function fetchDiagnosticCodes(req, res) {
  try {
    const codes = await getDiagnosticCodes();
    res.json({ codes });
  } catch (error) {
    console.error("Error fetching diagnostic codes:", error);
    res.status(500).json({ error: "Failed to load diagnostic codes" });
  }
}

// Predict readmission and survival probabilities
async function predict(req, res) {
  let { modelid, gender, age, readmissions, diagnosticCodes } = req.body;

  try {
    // If no model ID is provided, use the latest model
    if (!modelid) {
      const result = await pool.query(`
        SELECT modelid FROM models
        ORDER BY timestamp DESC
        LIMIT 1
      `);
      if (result.rows.length === 0) {
        return res.status(400).json({ error: "No models found in database." });
      }
      modelid = result.rows[0].modelid;
      console.log("Using latest model for guest:", modelid);
    }

    // Validate input fields
    if (gender === null || age === null || readmissions === null || diagnosticCodes.length === 0) {
      return res.status(400).json({ error: "All input fields are required" });
    }

    // Fetch all possible diagnostic codes
    const allDiagnosticCodes = await getDiagnosticCodes();

    // Initialize diagnostic codes to 0
    let diagnosticInput = {};
    allDiagnosticCodes.forEach((code) => (diagnosticInput[code] = 0));

    // Set selected diagnostic codes to 1
    diagnosticCodes.forEach((code) => {
      if (code in diagnosticInput) {
        diagnosticInput[code] = 1;
      }
    });

    console.log("Diagnostic Code Mappings:", diagnosticInput);

    // Call Flask API for prediction
    const response = await axios.post("http://127.0.0.1:5002/predict", {
      modelid,
      gender,
      age,
      readmissions,
      diagnosticCodes: Object.keys(diagnosticInput).filter((code) => diagnosticInput[code] === 1),
    });

    res.json(response.data);
  } catch (error) {
    console.error("Prediction failed:", error);
    res.status(500).json({ error: "Prediction failed: " + error.message });
  }
}

module.exports = {
  fetchDiagnosticCodes,
  predict,
};