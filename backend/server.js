require('dotenv').config();
require('dotenv').config();
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./authenticationRouting');
const db = require('./database');

const app = express();
app.use(cors());
app.use(bodyParser.json());


app.use('/auth', authRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
