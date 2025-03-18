const express = require('express');
const Task = require('./models/Task');
const authMiddleware = require('./middleware/auth');

const router = express.Router();

// Create a new task
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { text, category, time, date } = req.body;
        if (!text || !category || !time || !date) {
            return res.status(400).json({ error: 'Missing task fields' });
        }
        const newTask = new Task({
            user: req.user._id,
            text,
            category,
            time,
            date
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
