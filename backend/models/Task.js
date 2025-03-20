// backend/models/Task.js

const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    // ...existing fields
    recurrence: {
        frequency: {
            type: String,
            enum: ['none', 'daily', 'weekly', 'monthly'],
            default: 'none'
        },
        interval: Number,
        daysOfWeek: [Number], // For weekly (0-6, Sunday-Saturday)
        endDate: Date,
        occurrences: Number,
        originalTaskId: mongoose.Schema.Types.ObjectId
    },
    isRecurring: { type: Boolean, default: false }
});

module.exports = mongoose.model('Task', TaskSchema);
