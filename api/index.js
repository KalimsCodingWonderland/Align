// /api/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');

// --------------------
// Database Connection (with caching for serverless)
// --------------------
const mongoURI = process.env.MONGO_URI; // Ensure this is set to your hosted MongoDB URI in production
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose
            .connect(mongoURI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                bufferCommands: false,
            })
            .then((mongoose) => mongoose);
    }
    try {
        cached.conn = await cached.promise;
        console.log('✅ MongoDB Connected');
        return cached.conn;
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        throw err;
    }
}

// --------------------
// Define Mongoose User Model
// --------------------
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    full_name:{ type: String },
    created_at:{ type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// --------------------
// Create Express App
// --------------------
const app = express();
app.use(cors());
app.use(express.json());

// Middleware to ensure the database is connected before processing requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// --------------------
// Authentication Routes
// --------------------
const router = express.Router();

// Register Route
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;
        let user = await User.findOne({ email });
        if (user) {
            return res.json({ error: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({
            username,
            email,
            password: hashedPassword,
            full_name
        });
        await user.save();
        res.json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error(err);
        res.json({ error: 'Server error' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }
        console.log(`🔍 Checking user: ${email}`);
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`❌ User not found: ${email}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        console.log(`🔑 Checking password for user: ${email}`);
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`❌ Password mismatch for: ${email}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        console.log(`✅ Login successful for: ${email}`);
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login successful', token, user: { id: user._id, email: user.email } });
    } catch (error) {
        console.error('🔥 Server Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mount authentication routes under /auth
app.use('/auth', router);

// --------------------
// Export the Serverless Handler for Vercel
// --------------------
module.exports.handler = serverless(app);
