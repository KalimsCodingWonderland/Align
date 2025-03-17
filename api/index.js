// api/index.js
const serverless = require('serverless-http');
const app = require('../backend/server'); // Adjust the path as needed

// Export the serverless handler
module.exports.handler = serverless(app);
