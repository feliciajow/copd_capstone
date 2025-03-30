const pool = require("./database");

// Fetch diagnostic codes from the database
async function getDiagnosticCodes() {
  try {
    const result = await pool.query("SELECT code_name FROM diagnostic_codes");
    return result.rows.map((row) => row.code_name);
  } catch (error) {
    console.error("Error fetching diagnostic codes:", error);
    throw error;
  }
}

module.exports = {
  getDiagnosticCodes,
};