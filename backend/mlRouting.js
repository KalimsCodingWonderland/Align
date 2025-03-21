// backend/mlRouting.js

const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const router = express.Router();
const Feedback = require('./models/Feedback');

const ML_SERVICE_URL = 'https://alignml.onrender.com';

router.post('/predict', async (req, res) => {
    try {
        const { userId, category } = req.body;
        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, category }),
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.json({ predicted_duration: 30 });
    }
});

router.post('/feedback', async (req, res) => {
    try {
        const { userId, category, predicted_duration, user_duration, taskId } = req.body;
        const feedback = new Feedback({
            user_id: userId,
            category: category,
            duration: user_duration,
            task_id: taskId
        });
        await feedback.save();
        res.json({ status: "success" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "error" });
    }
});


module.exports = router;
