// backend/models/Task.js

const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    category: { type: String, required: true },
    time: { type: String, required: true }, // Stored in HH:MM format
    date: { type: Date, required: true },
    predicted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Task', TaskSchema);
