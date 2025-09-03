// server.js - single coherent Express + SQLite backend
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const dbPath = path.resolve(__dirname, 'facial_recognition.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening DB:', err.message);
  else console.log('Connected to SQLite DB at', dbPath);
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';

// Calculate cosine similarity between two numeric arrays
function cosineSimilarity(a, b) {
  // Ensure arrays and convert to numbers
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  
  // Normalize lengths if needed
  if (a.length !== b.length) {
    console.warn(`Length mismatch: a=${a.length}, b=${b.length}`);
    const min = Math.min(a.length, b.length);
    a = a.slice(0, min);
    b = b.slice(0, min);
  }

  // Convert to numbers and handle NaN/undefined
  const aNorm = a.map(x => Number(x) || 0);
  const bNorm = b.map(x => Number(x) || 0);
  
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < aNorm.length; i++) {
    dot += aNorm[i] * bNorm[i];
    na += aNorm[i] * aNorm[i];
    nb += bNorm[i] * bNorm[i];
  }

  // Avoid division by zero and handle degenerate cases
  if (na === 0 || nb === 0) {
    console.warn('Zero magnitude vector detected');
    return 0;
  }

  const sim = dot / (Math.sqrt(na) * Math.sqrt(nb));
  
  // Ensure result is in valid range
  if (sim < -1 || sim > 1 || Number.isNaN(sim)) {
    console.warn(`Invalid similarity: ${sim}`);
    return 0;
  }
  
  // Return absolute value since negative cosine similarity 
  // still indicates similar directions for face embeddings
  return Math.abs(sim);
}

// Initialize schema and default admin user
db.serialize(() => {
  // Core tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS face_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    embedding TEXT NOT NULL,
    image_path TEXT,
    confidence REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    teacher_id INTEGER NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    session_name TEXT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance_records (
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
  )`);

  // Create default admin if none exists
  db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'teacher'`, (err, row) => {
    if (!err && row && row.count === 0) {
      const hash = bcrypt.hashSync('1234', 10);
      db.run(`INSERT INTO users (student_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        ['admindut', 'Admin DUT', 'admindut@dut4life.ac.za', hash, 'teacher']);
    }
  });
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  // Accept either student_id or email for login to support frontend behavior
  const { student_id, email, password } = req.body;
  if ((!student_id && !email) || !password) return res.status(400).json({ error: 'student_id/email and password required' });

  const lookupField = email ? 'email' : 'student_id';
  const lookupValue = email ? email : student_id;

  db.get(`SELECT * FROM users WHERE ${lookupField} = ?`, [lookupValue], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !bcrypt.compareSync(password, user.password_hash || '')) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    // Return token and user object compatible with frontend expectations
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email, student_id: user.student_id } });
  });
});

// User endpoints
app.get('/api/users', (req, res) => {
  db.all(`SELECT id, student_id, name, email, role, created_at FROM users WHERE role != 'deleted'`,
    [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
});

// Face endpoints
app.post('/api/faces/enroll', upload.single('image'), (req, res) => {
  const { user_id, embedding, confidence = 0 } = req.body;
  const image_path = req.file ? req.file.path : null;

  if (!user_id || !embedding) return res.status(400).json({ error: 'user_id and embedding required' });

  db.get(`SELECT COUNT(*) as count FROM face_embeddings WHERE user_id = ?`, [user_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const existing = row?.count || 0;
    const MAX_PER_USER = 10;

    if (existing >= MAX_PER_USER) {
      return res.status(400).json({ error: `Embedding limit reached: max ${MAX_PER_USER}` });
    }

    const embStr = typeof embedding === 'string' ? embedding : JSON.stringify(embedding);
    db.run(`INSERT INTO face_embeddings (user_id, embedding, image_path, confidence) VALUES (?, ?, ?, ?)`,
      [user_id, embStr, image_path, confidence],
      function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({
          id: this.lastID,
          user_id: Number(user_id),
          embedding: embStr,
          image_path,
          confidence: Number(confidence)
        });
      });
  });
});

// List enrolled face embeddings with user info
app.get('/api/faces', (req, res) => {
  db.all(`SELECT fe.id, fe.user_id, fe.embedding, fe.image_path, fe.confidence, fe.created_at, u.name, u.student_id
          FROM face_embeddings fe
          JOIN users u ON fe.user_id = u.id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/faces/recognize', (req, res) => {
  const { embedding, threshold = 0.4 } = req.body; // Lowered threshold for testing
  console.log('Recognition request received:', { 
    threshold,
    embeddingType: typeof embedding,
    isArray: Array.isArray(embedding),
    length: embedding?.length
  });
  if (!embedding) return res.status(400).json({ error: 'Face embedding required' });

  let parsed = [];
  try {
    parsed = Array.isArray(embedding) ? embedding : JSON.parse(embedding);
    console.log('Parsed embedding:', {
      length: parsed.length,
      sample: parsed.slice(0, 5),
      type: typeof parsed[0]
    });
  } catch (e) {
    console.error('Error parsing embedding:', e);
    parsed = (embedding || '').split(',').map(Number).filter(n => !Number.isNaN(n));
  }

  db.all(`SELECT fe.*, u.name, u.student_id, u.email 
          FROM face_embeddings fe 
          JOIN users u ON fe.user_id = u.id`,
    [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      let best = null;
      let bestSim = 0;

      console.log(`Comparing against ${rows.length} stored faces`);
      
      for (const r of rows) {
        let stored = [];
        try {
          stored = Array.isArray(r.embedding) ? r.embedding : JSON.parse(r.embedding);
        } catch (e) {
          stored = (r.embedding || '').split(',').map(Number).filter(n => !Number.isNaN(n));
        }

        const sim = cosineSimilarity(parsed, stored);
        console.log(`Similarity with user ${r.name} (${r.student_id}): ${sim}`);
        
        if (sim > threshold && sim > bestSim) {
          bestSim = sim;
          best = r;
          console.log(`New best match: ${r.name} with similarity ${sim}`);
        }
      }

      if (best) {
        return res.json({
          recognized: true,
          id: best.user_id,
          name: best.name,
          student_id: best.student_id,
          similarity: bestSim,
          confidence: bestSim * 100
        });
      }

      res.json({
        recognized: false,
        name: 'Unknown Face',
        similarity: 0.0,
        confidence: 0.0
      });
    });
});

// Class management
app.post('/api/classes', (req, res) => {
  const { name, code, teacher_id, description } = req.body;
  db.run(`INSERT INTO classes (name, code, teacher_id, description) VALUES (?, ?, ?, ?)`,
    [name, code, teacher_id, description],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, name, code, teacher_id, description });
    });
});

app.get('/api/classes', (req, res) => {
  db.all(`SELECT c.*, u.name as teacher_name 
          FROM classes c 
          JOIN users u ON c.teacher_id = u.id`,
    [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
});

// Attendance sessions
app.post('/api/attendance/sessions', (req, res) => {
  const { class_id, session_name, session_date, start_time, end_time } = req.body;
  db.run(`INSERT INTO attendance_sessions (class_id, session_name, session_date, start_time, end_time)
          VALUES (?, ?, ?, ?, ?)`,
    [class_id, session_name, session_date, start_time, end_time],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, class_id, session_name, session_date, start_time, end_time });
    });
});

app.get('/api/attendance/sessions', (req, res) => {
  const { class_id, date } = req.query;
  let query = `SELECT ats.*, c.name as class_name 
               FROM attendance_sessions ats 
               JOIN classes c ON ats.class_id = c.id`;
  const params = [];

  if (class_id || date) {
    const clauses = [];
    if (class_id) {
      clauses.push('ats.class_id = ?');
      params.push(class_id);
    }
    if (date) {
      clauses.push('ats.session_date = ?');
      params.push(date);
    }
    query += ' WHERE ' + clauses.join(' AND ');
  }

  query += ' ORDER BY ats.session_date DESC, ats.start_time DESC';

  db.all(query, params, (err, sessions) => {
    if (err) return res.status(500).json({ error: err.message });
    if (sessions.length === 0) return res.json([]);

    // Get attendance records for these sessions
    const sessionIds = sessions.map(s => s.id);
    const recordsQuery = `SELECT ar.*, u.name, u.student_id 
                         FROM attendance_records ar 
                         JOIN users u ON ar.user_id = u.id 
                         WHERE ar.session_id IN (${sessionIds.map(() => '?').join(',')})
                         ORDER BY ar.timestamp DESC`;

    db.all(recordsQuery, sessionIds, (err, records) => {
      if (err) return res.status(500).json({ error: err.message });

      // Attach records to their sessions
      const result = sessions.map(session => ({
        ...session,
        records: records.filter(r => r.session_id === session.id)
      }));

      res.json(result);
    });
  });
});

// Attendance recording
app.post('/api/attendance/record', upload.single('image'), (req, res) => {
  const { session_id, user_id, status = 'present', confidence = 0 } = req.body;
  const image_path = req.file ? req.file.path : null;

  if (!session_id || !user_id) {
    return res.status(400).json({ error: 'session_id and user_id required' });
  }

  db.run(`INSERT OR REPLACE INTO attendance_records 
          (session_id, user_id, status, confidence, image_path)
          VALUES (?, ?, ?, ?, ?)`,
    [session_id, user_id, status, confidence, image_path],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({
        id: this.lastID || 'updated',
        session_id,
        user_id,
        status,
        confidence,
        image_path
      });
    });
});

// Analytics endpoints
app.get('/api/attendance/recent', (req, res) => {
  const query = `SELECT ar.id, u.name as student_name, ar.status, ar.timestamp, ar.confidence, 
                        ass.session_name, c.name as class_name
                 FROM attendance_records ar
                 JOIN users u ON ar.user_id = u.id
                 JOIN attendance_sessions ass ON ar.session_id = ass.id
                 JOIN classes c ON ass.class_id = c.id
                 ORDER BY ar.timestamp DESC
                 LIMIT 20`;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/attendance/top-performers', (req, res) => {
  const query = `WITH StudentAttendance AS (
    SELECT 
      u.id,
      u.name,
      u.student_id,
      COUNT(DISTINCT ar.session_id) as sessions_attended,
      (
        SELECT COUNT(DISTINCT id) 
        FROM attendance_sessions 
        WHERE session_date >= date('now', '-30 days')
      ) as total_sessions,
      CAST(COUNT(DISTINCT ar.session_id) AS FLOAT) / (
        SELECT COUNT(DISTINCT id) 
        FROM attendance_sessions 
        WHERE session_date >= date('now', '-30 days')
      ) * 100 as attendance_rate
    FROM users u
    LEFT JOIN attendance_records ar ON u.id = ar.user_id
    WHERE u.role = 'student'
    AND (
      ar.session_id IS NULL 
      OR EXISTS (
        SELECT 1 
        FROM attendance_sessions ass 
        WHERE ass.id = ar.session_id 
        AND ass.session_date >= date('now', '-30 days')
      )
    )
    GROUP BY u.id, u.name, u.student_id
  )
  SELECT *
  FROM StudentAttendance
  WHERE total_sessions > 0
  ORDER BY attendance_rate DESC
  LIMIT 10`;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Global error handler
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
