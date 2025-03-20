// backend/taskRouting.js

const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const Task = require('./models/Task');
const authMiddleware = require('./middleware/auth');

const router = express.Router();

const generateRecurringInstances = (task, recurrence) => {
    const instances = [];
    let currentDate = new Date(task.date);
    const endConditions = {
        date: recurrence.endDate ? new Date(recurrence.endDate) : null,
        occurrences: recurrence.occurrences || Infinity
    };

    let count = 0;
    while (count < endConditions.occurrences) {
        if (endConditions.date && currentDate > endConditions.date) break;

        instances.push({
            ...task,
            _id: undefined,
            originalTaskId: task._id,
            date: new Date(currentDate),
            recurrence: {
                ...recurrence,
                isRecurring: true
            }
        });

        // Increment based on frequency
        switch (recurrence.frequency) {
            case 'daily':
                currentDate.setDate(currentDate.getDate() + recurrence.interval);
                break;
            case 'weekly':
                currentDate.setDate(currentDate.getDate() + (7 * recurrence.interval));
                break;
            case 'monthly':
                currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
                break;
        }
        count++;
    }

    return instances;
};

// Create a new task with ML prediction if duration is default "30 min"
router.post('/', authMiddleware, async (req, res) => {
    try {
        let { text, category, time, date } = req.body;
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
        });
        const savedTask = await newTask.save();
        res.json(savedTask);
        if (req.body.recurrence && req.body.recurrence.frequency !== 'none') {
            const instances = generateRecurringInstances(newTask, req.body.recurrence);
            await Task.insertMany(instances);
        }

        res.json(newTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get tasks for logged in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user._id });
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
        const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
