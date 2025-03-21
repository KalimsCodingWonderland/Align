const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    duration: { type: Number, required: true },
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);