const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "cghdb",
  password: "cghrespi",
  port: 5432,
});

module.exports = pool;