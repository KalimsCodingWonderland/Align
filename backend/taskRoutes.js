// backend/taskRoutes.js
const express = require('express');
const Task = require('./models/Task');
const auth = require('./middleware/auth');

const router = express.Router();

// Create a new task for the authenticated user
router.post('/', auth, async (req, res) => {
    try {
        const { text, category, time, date } = req.body;
        const userId = req.user.id;
        const task = new Task({ text, category, time, date, user: userId });
        await task.save();
        res.status(201).json({ message: 'Task created successfully', task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all tasks for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const tasks = await Task.find({ user: userId });
        res.json({ tasks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update a task (edit)
router.put('/:id', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { text, category, time, date } = req.body;
        const task = await Task.findOne({ _id: id, user: userId });
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Update only provided fields
        if (text) task.text = text;
        if (category) task.category = category;
        if (time) task.time = time;
        if (date) task.date = date;

        await task.save();
        res.json({ message: 'Task updated successfully', task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a task
router.delete('/:id', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const task = await Task.findOneAndDelete({ _id: id, user: userId });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
