// server.js - Enhanced SQLite Backend
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// Database setup
const dbPath = path.resolve(__dirname, "facial_recognition.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

// Create tables
db.serialize(() => {
  // Users table (now stores password_hash)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Face embeddings table
  db.run(`
    CREATE TABLE IF NOT EXISTS face_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      embedding TEXT NOT NULL,
      image_path TEXT,
      confidence REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Classes table
  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      teacher_id INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Attendance sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      session_name TEXT NOT NULL,
      session_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME,
      is_active BOOLEAN DEFAULT true,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )
  `);

  // Attendance records table
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'present',
      confidence REAL DEFAULT 0.0,
      image_path TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(session_id, user_id)
    )
  `);

  // Create default admin user with hashed password '1234'
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'", (err, row) => {
    if (!err && row.count === 0) {
      const adminPassword = '1234';
      const hash = bcrypt.hashSync(adminPassword, 10);
      db.run(
        `INSERT INTO users (student_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        ['admindut', 'Admin DUT', 'admindut@dut4life.ac.za', hash, 'teacher'],
        (err) => {
          if (!err) {
            console.log("\u2705 Default admin user created (student_id: admindut, password: 1234)");
          } else {
            console.error("\u274c Failed to create default admin user:", err && err.message);
          }
        }
      );
    }
  });

});
// Routes
// Routes

// Health check
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 DUT Facial Recognition API is running",
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.post("/api/auth/login", (req, res) => {
  const { email, studentId, password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  let query = "SELECT * FROM users WHERE ";
  let params = [];

  if (email) {
    query += "email = ? AND role != 'deleted'";
    params.push(email);
  } else if (studentId) {
    query += "student_id = ? AND role != 'deleted'";
    params.push(studentId);
  } else {
    return res.status(400).json({ error: "Email or student ID required" });
  }

  db.get(query, params, (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hash = user.password_hash;
    if (!hash) {
      return res.status(400).json({ error: 'User has no password set' });
    }

    const valid = bcrypt.compareSync(password, hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password_hash, ...userData } = user;
    // Generate a real JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
    res.json({ user: userData, token });
  });
});

app.post("/api/auth/register", (req, res) => {
  const { studentId, name, email, password, role = 'student' } = req.body;

  if (!studentId || !name || !email || !password) {
    return res.status(400).json({ error: "Student ID, name, email and password are required" });
  }

  const hash = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (student_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
    [studentId, name, email, hash, role],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: "Student ID or email already exists" });
        } else {
          res.status(400).json({ error: err.message });
        }
      } else {
        res.json({ 
          id: this.lastID, 
          studentId, 
          name, 
          email, 
          role,
          token: `mock_token_${this.lastID}`
        });
      }
    }
  );
});

// User routes
app.get("/api/users", (req, res) => {
  db.all("SELECT id, student_id, name, email, role, created_at FROM users WHERE role != 'deleted'", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get("/api/users/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT id, student_id, name, email, role, created_at FROM users WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(row);
    }
  });
});

// Face recognition routes
app.post("/api/faces/enroll", upload.single('image'), (req, res) => {
  const { user_id, embedding, confidence = 0.0 } = req.body;
  const image_path = req.file ? req.file.path : null;
  
  if (!user_id || !embedding) {
    return res.status(400).json({ error: "User ID and embedding are required" });
  }
  // Enforce per-user maximum embeddings (10 by policy)
  db.get(
    `SELECT COUNT(*) as count FROM face_embeddings WHERE user_id = ?`,
    [user_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const existing = row?.count || 0;
      const MAX_PER_USER = 10;
      if (existing >= MAX_PER_USER) {
        return res.status(400).json({ error: `Embedding limit reached: user already has ${existing} embeddings (max ${MAX_PER_USER})` });
      }

      db.run(
        `INSERT INTO face_embeddings (user_id, embedding, image_path, confidence) VALUES (?, ?, ?, ?)`,
        [user_id, embedding, image_path, confidence],
        function (err) {
          if (err) {
            res.status(400).json({ error: err.message });
          } else {
            res.json({
              id: this.lastID,
              user_id: parseInt(user_id),
              embedding,
              image_path,
              confidence: parseFloat(confidence)
            });
          }
        }
      );
    }
  );
});

app.get("/api/faces", (req, res) => {
  const query = `
    SELECT fe.*, u.name, u.student_id 
    FROM face_embeddings fe 
    JOIN users u ON fe.user_id = u.id
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post("/api/faces/recognize", upload.single('image'), (req, res) => {
  const { embedding, threshold = 0.6 } = req.body;
  const image_path = req.file ? req.file.path : null;
  
  if (!embedding) {
    return res.status(400).json({ error: "Face embedding is required" });
  }
  
  // Get all stored embeddings for comparison from real users only
  const query = `
    SELECT fe.*, u.name, u.student_id, u.email 
    FROM face_embeddings fe 
    JOIN users u ON fe.user_id = u.id
    WHERE u.student_id IN ('monwabisi', 'mogale') OR u.role = 'teacher'
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Compare embeddings with stored ones
    let bestMatch = null;
    let highestSimilarity = 0;
    
    for (const row of rows) {
      let storedEmbedding = [];
      try {
        storedEmbedding = Array.isArray(row.embedding) ? row.embedding : JSON.parse(row.embedding);
      } catch (e) {
        // fallback if stored as string of numbers
        storedEmbedding = (row.embedding || '').split(',').map(Number).filter(n => !Number.isNaN(n));
      }

      let parsedEmbedding = [];
      try {
        parsedEmbedding = Array.isArray(embedding) ? embedding : JSON.parse(embedding);
      } catch (e) {
        parsedEmbedding = (embedding || '').split(',').map(Number).filter(n => !Number.isNaN(n));
      }

      const similarity = cosineSimilarity(parsedEmbedding, storedEmbedding);
      
      if (similarity > threshold && similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = row;
      }
    }
    
    if (bestMatch) {
      // Return the real user's information
      res.json({
        id: bestMatch.user_id,
        name: bestMatch.name,
        student_id: bestMatch.student_id,
        similarity: highestSimilarity,
        confidence: highestSimilarity * 100,
        recognized: true
      });
    } else {
      // Return "Unknown Face" for unrecognized faces
      res.json({
        recognized: false,
        name: "Unknown Face",
        similarity: 0.0,
        confidence: 0.0
      });
    }
  });
});

// Helper - cosine similarity between two numeric arrays
function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length !== b.length) {
    // If dimensions differ, try to align by truncation
    const minLen = Math.min(a.length, b.length);
    a = a.slice(0, minLen);
    b = b.slice(0, minLen);
  }
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = Number(a[i]) || 0;
    const bi = Number(b[i]) || 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Class management routes
app.post("/api/classes", (req, res) => {
  const { name, code, teacher_id, description } = req.body;
  
  db.run(
    `INSERT INTO classes (name, code, teacher_id, description) VALUES (?, ?, ?, ?)`,
    [name, code, teacher_id, description],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, name, code, teacher_id, description });
      }
    }
  );
});

app.get("/api/classes", (req, res) => {
  const query = `
    SELECT c.*, u.name as teacher_name 
    FROM classes c 
    JOIN users u ON c.teacher_id = u.id
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Attendance session routes
app.post("/api/attendance/sessions", (req, res) => {
  const { class_id, session_name, session_date, start_time, end_time } = req.body;
  
  db.run(
    `INSERT INTO attendance_sessions (class_id, session_name, session_date, start_time, end_time) 
     VALUES (?, ?, ?, ?, ?)`,
    [class_id, session_name, session_date, start_time, end_time],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ 
          id: this.lastID, 
          class_id, 
          session_name, 
          session_date, 
          start_time, 
          end_time 
        });
      }
    }
  );
});

app.get("/api/attendance/sessions", (req, res) => {
  const { class_id } = req.query;
  let query = `
    SELECT ats.*, c.name as class_name 
    FROM attendance_sessions ats 
    JOIN classes c ON ats.class_id = c.id
  `;
  let params = [];
  
  if (class_id) {
    query += " WHERE ats.class_id = ?";
    params.push(class_id);
  }
  
  query += " ORDER BY ats.session_date DESC, ats.start_time DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Attendance recording
app.post("/api/attendance/record", upload.single('image'), (req, res) => {
  const { session_id, user_id, status = 'present', confidence = 0.0 } = req.body;
  const image_path = req.file ? req.file.path : null;
  
  db.run(
    `INSERT OR REPLACE INTO attendance_records (session_id, user_id, status, confidence, image_path) 
     VALUES (?, ?, ?, ?, ?)`,
    [session_id, user_id, status, confidence, image_path],
    function (err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ 
          id: this.lastID || 'updated', 
          session_id, 
          user_id, 
          status, 
          confidence, 
          image_path 
        });
      }
    }
  );
});

// Get attendance records
app.get("/api/attendance/records/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const query = `
    SELECT ar.*, u.name, u.student_id, u.email 
    FROM attendance_records ar 
    JOIN users u ON ar.user_id = u.id 
    WHERE ar.session_id = ?
    ORDER BY ar.timestamp DESC
  `;
  
  db.all(query, [sessionId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`📁 Uploads: ${uploadsDir}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Closing database connection...');
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed.');
    }
    process.exit(0);
  });
});