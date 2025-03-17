

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./database'); // ✅ Import database connection
require('dotenv').config();

const authenticationRoutes = require('./authenticationRouting');

const app = express();
app.use(cors());
app.use(express.json()); // ✅ Ensure request body is parsed

// ✅ Connect to MongoDB before starting the server
connectDB().then(() => {
    app.use('/auth', authenticationRoutes); // Mount routes only after DB connection

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}).catch(err => console.error('❌ Failed to start server:', err));