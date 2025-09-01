// server.js - Enhanced SQLite Backend
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");

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
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
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

  // Create default admin user
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'", (err, row) => {
    if (!err && row.count === 0) {
      db.run(`
        INSERT INTO users (student_id, name, email, role) 
        VALUES ('ADMIN001', 'Admin Teacher', 'admin@dut.ac.za', 'teacher')
      `, (err) => {
        if (!err) {
          console.log("✅ Default admin user created");
        }
      });
    }
  });
});

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
  const { email, studentId } = req.body;
  
  let query = "SELECT * FROM users WHERE ";
  let params = [];
  
  if (email) {
    query += "email = ?";
    params.push(email);
  } else if (studentId) {
    query += "student_id = ?";
    params.push(studentId);
  } else {
    return res.status(400).json({ error: "Email or student ID required" });
  }
  
  db.get(query, params, (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      // Remove sensitive data and return user
      const { ...userData } = user;
      res.json({ 
        user: userData,
        token: `mock_token_${user.id}` // In production, use JWT
      });
    }
  });
});

app.post("/api/auth/register", (req, res) => {
  const { studentId, name, email, role = 'student' } = req.body;
  
  if (!studentId || !name || !email) {
    return res.status(400).json({ error: "Student ID, name, and email are required" });
  }
  
  db.run(
    `INSERT INTO users (student_id, name, email, role) VALUES (?, ?, ?, ?)`,
    [studentId, name, email, role],
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
  db.all("SELECT id, student_id, name, email, role, created_at FROM users", [], (err, rows) => {
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
  
  // Get all stored embeddings for comparison
  const query = `
    SELECT fe.*, u.name, u.student_id, u.email 
    FROM face_embeddings fe 
    JOIN users u ON fe.user_id = u.id
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // In a real implementation, you'd compare embeddings here
    // For now, we'll return a mock response
    const mockMatch = rows.length > 0 ? {
      ...rows[0],
      similarity: 0.85,
      recognized: true
    } : {
      recognized: false,
      similarity: 0.0
    };
    
    res.json(mockMatch);
  });
});

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