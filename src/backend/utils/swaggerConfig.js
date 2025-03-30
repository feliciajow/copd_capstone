const path = require("path");

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "COPD Capstone API",
      version: "1.0.0",
      description: "API documentation for the COPD Capstone project",
    },
    servers: [
      {
        url: "http://localhost:5000/",
      },
    ],
  },
  apis: [path.join(__dirname, "../routes/*.js")],
};

module.exports = swaggerOptions;