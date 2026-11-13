const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 

// Use the Render persistent disk if in production
const DB_FILE = process.env.NODE_ENV === 'production' 
    ? '/data/db.json' 
    : path.join(__dirname, 'db.json');

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

const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

app.get('/api/data', (req, res) => {
    res.json(readDB());
});

app.post('/api/users', (req, res) => {
    const db = readDB();
    db.users = req.body;
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/settings', (req, res) => {
    const db = readDB();
    db.settings = req.body;
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});