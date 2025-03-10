const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const router = express.Router();


router.post('/register', async (req, res) => {
    const { username, email, password, first_name, last_name } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.json({ error: 'Database error' });

        if (results.length > 0) {
            return res.json({ message: 'User already exists' });
        }

        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            db.query(
                'INSERT INTO users (username, email, passwords, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
                [username, email, hashedPassword, first_name, last_name],
                (error, result) => {
                    if (error) return res.json({ error: 'Error inserting user' });
                    res.json({ message: 'User registered successfully!' });
                }
            );
        } catch (error) {
            res.json({ error: 'Server error' });
        }
    });
});


router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.json({ error: 'Database error' });

        if (results.length === 0) {
            return res.json({ message: 'Invalid username or password' });
        }

        const user = results[0];

        try {
            const isMatch = await bcrypt.compare(password, user.passwords);
            if (!isMatch) {
                return res.json({ message: 'Invalid username or password' });
            }

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name
                }
            });
        } catch (error) {
            res.json({ error: 'Server error' });
        }
    });
});

module.exports = router;
