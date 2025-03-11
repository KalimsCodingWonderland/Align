const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/userAuthentication"; // Update with your database name

const client = new MongoClient(mongoURI, {
    useNewUrlParser: true, // These are now ignored but kept for compatibility
    useUnifiedTopology: true
});

let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db(); // Selects the database
        console.log('✅ Connected to MongoDB database');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1); // Stop the server if connection fails
    }
}

function getDB() {
    if (!db) {
        throw new Error('❌ Database not initialized');
    }
    return db;
}

module.exports = { connectDB, getDB };
