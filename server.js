const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serves HTML and JS files

const DB_FILE = path.join(__dirname, 'db.json');

// Helper to read database
const readDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({ users: {}, settings: {} }));
        }
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return { users: {}, settings: {} };
    }
};

// Helper to write database
const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// API: Get all data (users & settings)
app.get('/api/data', (req, res) => {
    res.json(readDB());
});

// API: Save Users (Used by Admin and User Signup)
app.post('/api/users', (req, res) => {
    const db = readDB();
    db.users = req.body;
    writeDB(db);
    res.json({ success: true });
});

// API: Save Settings (Used by Admin)
app.post('/api/settings', (req, res) => {
    const db = readDB();
    db.settings = req.body;
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});