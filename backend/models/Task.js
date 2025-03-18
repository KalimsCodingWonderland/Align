// backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        text: { type: String, required: true },
        category: { type: String, required: true },
        time: { type: String, required: true },
        date: { type: Date, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    },
    { timestamps: true }
);

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;
