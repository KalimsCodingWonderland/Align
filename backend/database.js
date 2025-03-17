// backend/database.js

const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;

let db;

async function connectDB() {
    if (db) return db; // Reuse existing connection

    try {
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });

        db = mongoose.connection;
        console.log('✅ MongoDB Connected');
        return db;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        throw error;
    }
}

function getDB() {
    if (!db) throw new Error('Database not initialized');
    return db;
}

module.exports = { connectDB, getDB };
