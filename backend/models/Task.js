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
    reminderOffset: { type: Number, default: 0 }, // in minutes
    notificationId: { type: String }, // Store notification ID
});

const MAX_DELETED_PER_CATEGORY = 5;   // ⇦ set whatever limit you want

/**
 * Whenever a task is saved with deleted === true, make sure that the number
 * of *deleted* tasks for (user, category) does not exceed the cap.
 * Surplus oldest docs are hard-deleted (based on _id creation order).
 */
TaskSchema.post('save', async function (doc) {
    if (!doc.deleted) return;                 // only prune when a task is soft-deleted

    try {
        const Task = this.constructor;

        // count how many deleted tasks exist for *this user & category*
        const total = await Task.countDocuments({
            user: doc.user,
            category: doc.category,
            deleted: true,
        });

        if (total > MAX_DELETED_PER_CATEGORY) {
            const surplus = total - MAX_DELETED_PER_CATEGORY;

            // pick the oldest surplus docs and remove them
            const victims = await Task.find({
                user: doc.user,
                category: doc.category,
                deleted: true,
            })
                .sort({ _id: 1 })           // older _id ⇒ created earlier
                .limit(surplus)
                .select('_id');

            await Task.deleteMany({ _id: { $in: victims.map(v => v._id) } });
        }
    } catch (err) {
        console.error('Pruning deleted tasks (per-category) failed:', err);
        // even if pruning fails the original save still succeeds
    }
});

module.exports = mongoose.model('Task', TaskSchema);