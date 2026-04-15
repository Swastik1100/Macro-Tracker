const express = require('express');
const router = express.Router();
const db = require('./db'); // Assuming a db module that handles database connections and queries

// User registration route
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    // Hash password (use bcrypt or similar)
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = await db.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *', [username, hashedPassword]);
        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'User registration failed' });
    }
});

// User login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (user.rows.length > 0) {
            const match = await bcrypt.compare(password, user.rows[0].password);
            if (match) {
                // Generate a token (use jsonwebtoken or similar)
                const token = jwt.sign({ id: user.rows[0].id }, 'secretkey', { expiresIn: '1h' });
                res.json({ token });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Database function to get user by ID
async function getUserById(id) {
    const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return user.rows[0];
}

module.exports = router;