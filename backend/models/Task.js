// backend/models/Task.js
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    category: { type: String, required: true },
    time: { type: String, required: true }, // Stored in HH:MM format
    date: { type: Date, required: true },
    predicted: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    recurrence: {
        type: {
            type: String,
            enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
            default: 'none'
        },
        daysOfWeek: [{
            type: Number,
            enum: [0, 1, 2, 3, 4, 5, 6] // 0=Sunday to 6=Saturday
        }],
        interval: {
            type: Number,
            default: 1
        },
        endType: {
            type: String,
            enum: ['never', 'date', 'count'],
            default: 'never'
        },
        endDate: Date,
        occurrences: Number
    },
    originalTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        index: true // Add index for faster lookups
    },
    isRecurringInstance: {
        type: Boolean,
        default: false
    },
    reminderEnabled: { type: Boolean, default: false },
    reminderOffset: { type: Number, default: 10 } // Offset in minutes
});

module.exports = mongoose.model('Task', TaskSchema);