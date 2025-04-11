// backend/taskRouting.js

const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const Task = require('./models/Task');
const authMiddleware = require('./middleware/auth');
const Feedback = require('./models/Feedback');
const router = express.Router();

// Create a new task with ML prediction if duration is default "30 min"
router.post('/', authMiddleware, async (req, res) => {
    try {
        let { text, category, time, date, recurrence } = req.body;
        if (!text || !category || !time || !date) {
            return res.status(400).json({ error: 'Missing task fields' });
        }
        let predicted = false;
        // If duration is the default "30 min", use ML prediction
        if (time === "00:00" || time === "DEFAULT") {
            // Count tasks for this category for the current user
            const count = await Task.countDocuments({ user: req.user._id, category });
            if (count < 5) {
                time = "00:30";
            } else {
                try {
                    const mlResponse = await fetch('https://alignml.onrender.com/predict', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: req.user._id, category }),
                    });
                    const mlData = await mlResponse.json();
                    if (mlData && mlData.predicted_duration) {
                        let minutes = mlData.predicted_duration;
                        let hrs = Math.floor(minutes / 60);
                        let mins = minutes % 60;
                        time = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                        predicted = true;
                    } else {
                        time = "00:30";
                    }
                } catch (err) {
                    console.error('ML prediction error:', err);
                    time = "00:30";
                }
            }
        }
        const newTask = new Task({
            user: req.user._id,
            text,
            category,
            time,
            date,
            predicted,
            recurrence: recurrence.type !== 'none' ? {
                type: recurrence.type,
                daysOfWeek: recurrence.daysOfWeek || [],
                interval: recurrence.interval || 1,
                endType: recurrence.endType || 'never',
                endDate: recurrence.endDate || null,
                occurrences: recurrence.occurrences || null
            } : null,
            isRecurring: recurrence.type !== 'none'
        });
        const savedTask = await newTask.save();
        res.json(savedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get tasks for logged in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({
            user: req.user._id,
            deleted: { $ne: true }  // Exclude soft-deleted tasks
        });
        res.json(tasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update a task
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const updatedTask = await Task.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            req.body,
            { new: true }
        );
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a task
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deletedTask = await Task.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { $set: { deleted: true } },  // Soft delete instead of removing
            { new: true }
        );
        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        // Remove the feedback deletion line completely
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;