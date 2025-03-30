const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// Fetch diagnostic codes
/**
 * @swagger
 * /diagnostic-codes:
 *   get:
 *     summary: Fetch diagnostic codes from PostgreSQL database
 *     responses:
 *       200:
 *         description: List of diagnostic codes
 */
router.get("/diagnostic-codes", dashboardController.fetchDiagnosticCodes);

// Predict readmission and survival probabilities
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
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Internal Server Error
 */
router.post("/predict", dashboardController.predict);

module.exports = router;