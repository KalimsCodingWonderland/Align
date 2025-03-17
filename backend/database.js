//backend/database.js

const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI;

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            bufferCommands: false // Disable mongoose buffering
        }).then(mongoose => mongoose);
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

function getDB() {
    if (!cached.conn) throw new Error('Database not initialized');
    return cached.conn;
}

module.exports = { connectDB, getDB };