const express = require('express');
const cors = require('cors');
const { connectDB } = require('./database');
require('dotenv').config();

const authenticationRoutes = require('./authenticationRouting');
const taskRoutes = require('./taskRouting');

const app = express();
app.use(cors());
app.use(express.json());

connectDB().then(() => {
    app.use('/auth', authenticationRoutes);
    app.use('/tasks', taskRoutes);
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}).catch(err => console.error('❌ Failed to start server:', err));
