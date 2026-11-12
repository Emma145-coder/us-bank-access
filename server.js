const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');

// Helper function to read the database
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

// Helper function to write to the database
const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// API Endpoint to GET all users
app.get('/api/users', (req, res) => {
    const db = readDB();
    res.json(db);
});

// API Endpoint to SAVE all users (used by both admin and app)
app.post('/api/users', (req, res) => {
    const users = req.body;
    writeDB(users);
    res.json({ success: true });
});

// Serve your static HTML files (admin.html, index.html)
app.use(express.static(path.join(__dirname)));

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});