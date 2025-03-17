const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { getDB } = require('./database');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;

        let user = await User.findOne({ email });
        if (user) {
            return res.json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            email,
            password: hashedPassword,
            full_name
        });

        await user.save();
        res.json({ message: 'User registered successfully!' });

    } catch (err) {
        console.error(err);
        res.json({ error: 'Server error' });
    }
});



// ✅ Use `getDB()` to get the MongoDB instance
router.post('/login', async (req, res) => {
    try {
        const db = getDB(); // ✅ Get the database instance
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        console.log(`🔍 Checking user: ${email}`);

        const user = await db.collection('users').findOne({ email });
        if (!user) {
            console.log(`❌ User not found: ${email}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        console.log(`🔑 Checking password for user: ${email}`);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`❌ Password mismatch for: ${email}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        console.log(`✅ Login successful for: ${email}`);

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Login successful', token, user: { id: user._id, email: user.email } });
    } catch (error) {
        console.error('🔥 Server Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

