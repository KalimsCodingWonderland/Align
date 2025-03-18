const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;
let db;

async function connectDB() {
    try {
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        db = mongoose.connection;
        console.log('✅ Connected to MongoDB database');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

function getDB() {
    if (!db) {
        throw new Error('❌ Database not initialized');
    }
    return db;
}

module.exports = { connectDB, getDB };
