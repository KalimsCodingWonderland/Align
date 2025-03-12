const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/userAuthentication";

let db;

async function connectDB() {
    try {
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Shorter timeout
        });

        db = mongoose.connection; // ✅ Assign Mongoose connection
        console.log('✅ Connected to MongoDB database');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1); // Stop the server if connection fails
    }
}

// ✅ Fix: `getDB` should return the mongoose connection
function getDB() {
    if (!db) {
        throw new Error('❌ Database not initialized');
    }
    return db;
}

module.exports = { connectDB, getDB };
