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

const MAX_DELETED_PER_CATEGORY = 300;          // ← tune to taste

// helper reused by every hook
async function pruneDeleted(userId, category, Task) {
    const total = await Task.countDocuments({ user: userId, category, deleted: true });

    if (total > MAX_DELETED_PER_CATEGORY) {
        const surplus = total - MAX_DELETED_PER_CATEGORY;

        const victims = await Task.find({ user: userId, category, deleted: true })
            .sort({ _id: 1 })            // oldest first
            .limit(surplus)
            .select('_id');

        await Task.deleteMany({ _id: { $in: victims.map(v => v._id) } });
    }
}

/* ① fires when a document is saved via `.save()` */
TaskSchema.post('save', function (doc) {
    if (doc.deleted) pruneDeleted(doc.user, doc.category, this.constructor);
});

/* ② fires when a document is updated via any of these query helpers */
['findOneAndUpdate', 'updateOne', 'updateMany'].forEach((method) => {
    TaskSchema.post(method, async function (res) {
        // does the update turn `deleted` on?
        const upd = this.getUpdate() || {};
        const sets = { ...upd, ...(upd.$set || {}) };

        if (sets.deleted === true) {
            // `res` is only defined for findOneAndUpdate; if absent, re-fetch one victim doc
            const doc = res || await this.model.findOne(this.getQuery()).select('user category');
            if (doc) pruneDeleted(doc.user, doc.category, this.model);
        }
    });
});

module.exports = mongoose.model('Task', TaskSchema);