// backend/server.js
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./database');
require('dotenv').config();

const authRoutes = require('./authenticationRouting');
const taskRoutes = require('./taskRoutes');

const app = express();

app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Connect to MongoDB before starting the server
connectDB()
    .then(() => {
        app.use('/auth', authRoutes);
        app.use('/tasks', taskRoutes);

        const PORT = process.env.PORT || 5001;
        app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
    })
    .catch(err => console.error('❌ Failed to start server:', err));
