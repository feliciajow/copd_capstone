const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const { PythonShell } = require("python-shell");
const fs = require('fs').promises;
const path = require('path');
const axios = require("axios");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'COPD Capstone API',
      version: '1.0.0',
      description: 'API documentation for the COPD Capstone project',
    },
    servers: [
      {
        url: 'http://localhost:5001/',
      },
    ],
  },
  apis: [path.join(__dirname, 'dashboardserver.js')],
};
console.log("Current directory:", __dirname);
console.log("Full path:", path.join(__dirname, 'dashboardserver.js'));

const swaggerDocs = swaggerJsdoc(swaggerOptions);

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Connect database
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "cghdb",
    password: "cghrespi",
    port: 5432,
});


// A temp folder is created and check if it exists
const tempDir = path.join(__dirname, 'temp');
fs.mkdir(tempDir, { recursive: true }).catch(console.error);

// Function to fetch diagnostic codes
async function getDiagnosticCodes() {
    try {
        const result = await pool.query("SELECT code_name FROM diagnostic_codes");
        return result.rows.map(row => row.code_name);
    } catch (error) {
        console.error("Error fetching diagnostic codes:", error);
        throw error;
    }
}

//api documentation
/**
 * @swagger
 * /diagnostic-codes:
 *   get:
 *     summary: Fetch diagnostic codes from PostgreSQL database
 *     responses:
 *       200:
 *         description: List of diagnostic codes
 */
// Fetch diagnostic codes from database
app.get("/diagnostic-codes", async (req, res) => {
    try {
        const codes = await getDiagnosticCodes();
        res.json({ codes });
    } catch (error) {
        res.status(500).json({ error: "Failed to load diagnostic codes" });
    }
});

// api documentation
/**
 * @swagger
 * /predict:
 *   post:
 *     summary: Predict Readmission and Survival Probabilities
 *     description: This endpoint predicts readmission and survival probabilities based on patient data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelid:
 *                 type: integer
 *                 description: ID of the model to use for prediction
 *               gender:
 *                 type: string
 *                 description: Gender of the patient (male/female)
 *               age:
 *                 type: integer
 *                 description: Age of the patient
 *               readmissions:
 *                 type: integer
 *                 description: Number of times the patient was admitted
 *               diagnosticCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of diagnostic codes
 *     responses:
 *       200:
 *         description: Prediction results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 readmission_30_day:
 *                   type: number
 *                   description: Probability of readmission within 30 days
 *                 readmission_60_day:
 *                   type: number
 *                   description: Probability of readmission within 60 days
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
// predict
app.post("/predict", async (req, res) => {
    let {modelid, gender, age, readmissions, diagnosticCodes } = req.body;

    try {
        // if no model ID provided because use guest, use latest model
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

        // Validation after fallback
        if (gender === null || age === null || readmissions === null || diagnosticCodes.length === 0) {
            return res.status(400).json({ error: "All input fields are required" });
        }

        // Fetch all possible diagnostic codes
        const allDiagnosticCodes = await getDiagnosticCodes();

        // Initialize diagnostic codes to 0
        let diagnosticInput = {};
        allDiagnosticCodes.forEach(code => diagnosticInput[code] = 0);

        // Set selected diagnostic codes to 1
        diagnosticCodes.forEach(code => {
            if (code in diagnosticInput) {
                diagnosticInput[code] = 1;
            }
        });

        console.log("Diagnostic Code Mappings:", diagnosticInput);

        // // Load Model from Cache or Database
        // const modelPath = await getModelPath(modelid);

        // // Format diagnostic codes for API request
        // const formattedCodes = Object.values(diagnosticInput).join(",");

        // Call Flask API for prediction
        const response = await axios.post("http://127.0.0.1:5002/predict", {
            modelid,
            gender,
            age,
            readmissions,
            diagnosticCodes: Object.keys(diagnosticInput).filter(code => diagnosticInput[code] === 1)
        });

        res.json(response.data);

    } catch (error) {
        console.error("Prediction failed:", error);
        res.status(500).json({ error: "Prediction failed: " + error.message });
    }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`DASHBOARD running on http://localhost:${PORT}`));
