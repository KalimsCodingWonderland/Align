// backend/server.js

const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
const { connectDB } = require('./database'); // Import database connection
require('dotenv').config();

const authenticationRoutes = require('./authenticationRouting');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB before mounting routes
connectDB()
    .then(() => {
        app.use('/auth', authenticationRoutes);
        console.log('Routes mounted.');
    })
    .catch(err => {
        console.error('❌ Failed to connect to MongoDB:', err);
    });

// Export the Express app as a serverless function
module.exports = serverless(app);
