const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const { PythonShell } = require("python-shell");
const fs = require('fs').promises;
const path = require('path');
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

// Fetch diagnostic codes from database
app.get("/diagnostic-codes", async (req, res) => {
    try {
        const codes = await getDiagnosticCodes();
        res.json({ codes });
    } catch (error) {
        res.status(500).json({ error: "Failed to load diagnostic codes" });
    }
});

// // Retrieve/Get model
// async function getModel(modelId) {
//     try {
//         const result = await pool.query(
//             "SELECT modelid, model_data FROM models WHERE modelid = $1",
//             [modelId]
//         );

//         if (result.rows.length > 0) {
//             return {
//                 modelid: result.rows[0].modelid,
//                 model_data: result.rows[0].model_data,
//             };
//         } else {
//             return null;
//         }
//     } catch (error) {
//         console.error("Error fetching model:", error);
//         return null;
//     }
// }

// // Function to Check and Retrieve Model from Cache or Database
// async function getModelPath(modelId) {
//     try {
//         const modelCachePath = path.join(tempDir, `model_${modelId}.pkl`);

//         // If model already exists in cache, return it
//         try {
//             await fs.access(modelCachePath);
//             console.log(`Using cached model: ${modelCachePath}`);
//             return modelCachePath;
//         } catch (error) {
//             console.log(`Model ${modelId} not found in cache. Fetching from database...`);
//         }

//         // Fetch model from database using getModel function
//         const modelData = await getModel(modelId);
//         if (!modelData) {
//             throw new Error(`Model ID ${modelId} not found in database`);
//         }

//         // Save new model file
//         await fs.writeFile(modelCachePath, modelData.model_data);
//         console.log(`Model ${modelId} saved to cache: ${modelCachePath}`);

//         return modelCachePath;
//     } catch (error) {
//         console.error("Error retrieving model:", error);
//         throw error;
//     }
// }

// predict
app.post("/predict", async (req, res) => {
    const {modelid, gender, age, readmissions, diagnosticCodes } = req.body;

    if (!modelid || gender === null || age === null || readmissions === null || diagnosticCodes.length === 0) {
        return res.status(400).json({ error: "All input fields are required" });
    }
    try {
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
