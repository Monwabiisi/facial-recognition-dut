// server.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());

// Database setup
const dbPath = path.resolve(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

// Create tables if not exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS faces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      image_path TEXT,
      embedding TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Facial Recognition DUT backend is running");
});

// Create new user
app.post("/users", (req, res) => {
  const { name, email } = req.body;
  db.run(
    `INSERT INTO users (name, email) VALUES (?, ?)`,
    [name, email],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, name, email });
      }
    }
  );
});

// Get all users
app.get("/users", (req, res) => {
  db.all(`SELECT * FROM users`, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Save a face linked to user
app.post("/faces", (req, res) => {
  const { user_id, image_path, embedding } = req.body;
  db.run(
    `INSERT INTO faces (user_id, image_path, embedding) VALUES (?, ?, ?)`,
    [user_id, image_path, embedding],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({
          id: this.lastID,
          user_id,
          image_path,
          embedding,
        });
      }
    }
  );
});

// Get all faces
app.get("/faces", (req, res) => {
  db.all(`SELECT * FROM faces`, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
