const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const { PythonShell } = require("python-shell");
const fs = require('fs').promises;
const path = require('path');

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

// Retrieve/Get model
async function getModel() {
    try {
        const result = await pool.query(
            "SELECT modelid, model_data FROM models ORDER BY timestamp DESC LIMIT 1"
        );

        if (result.rows.length > 0) {
            return {
                modelid: result.rows[0].modelid,
                model_data: result.rows[0].model_data,
            };
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}

// predict
app.post("/predict", async (req, res) => {
    const { gender, age, readmissions, diagnosticCodes } = req.body;

    if (gender === null || age === null || readmissions === null || diagnosticCodes.length === 0) {
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

        // Get latest model
        const modelData = await getModel();
        if (!modelData) {
            return res.status(404).json({ error: "No trained models found." });
        }

        // Write model data to temp file
        const tempModelPath = path.join(tempDir, `model_${Date.now()}.pkl`);
        await fs.writeFile(tempModelPath, modelData.model_data);

        const formattedCodes = Object.values(diagnosticInput).join(",");

        // Call Python script for prediction
        let options = {
            mode: "json",
            pythonOptions: ["-u"], 
            pythonPath: "python",   
            args: [tempModelPath, gender, age, readmissions, formattedCodes],
            stderrParser: true
        };

        PythonShell.run("predict.py", options)
            .then(async (results) => {
                // Clean up temp file
                await fs.unlink(tempModelPath).catch(console.error);

                if (results && results.length > 0) {
                    res.json(results[0]);  
                } else {
                    res.status(500).json({ error: "No prediction results" });
                }
            })
            .catch(async (err) => {
                await fs.unlink(tempModelPath).catch(console.error);
                res.status(500).json({ error: "Prediction failed: " + err.message });
            });

    } catch (error) {
        res.status(500).json({ error: "An error occurred while making predictions." });
    }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`DASHBOARD running on http://localhost:${PORT}`));
