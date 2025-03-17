// backend/server.js

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./database');
require('dotenv').config();

const authenticationRoutes = require('./authenticationRouting');
const app = express();

app.use(cors());
app.use(express.json());

// Check DB connection before handling requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.use('/auth', authenticationRoutes);

module.exports = app;