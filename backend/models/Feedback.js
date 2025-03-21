// backend/models/Feedback.js

const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        validate: {
            validator: v => mongoose.Types.ObjectId.isValid(v),
            message: props => `${props.value} is not a valid user ID!`
        }
    },
    task_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        validate: {
            validator: v => mongoose.Types.ObjectId.isValid(v),
            message: props => `${props.value} is not a valid task ID!`
        }
    },
    category: { type: String, required: true },
    duration: { type: Number, required: true }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);