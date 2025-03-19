const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const ML_SERVICE_URL = 'http://localhost:5002';

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
        const { userId, category, predicted_duration, user_duration } = req.body;
        const response = await fetch(`${ML_SERVICE_URL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, category, predicted_duration, user_duration }),
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.json({ status: "error" });
    }
});

module.exports = router;
