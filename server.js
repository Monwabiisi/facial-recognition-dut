// server.js - single coherent Express + SQLite backend
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve model files from public/models directory
app.use('/models', express.static(path.join(__dirname, 'public', 'models')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Ensure models directory exists
const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Face-api.js model management
const CDN_BASE_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
const REQUIRED_MODEL_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1.bin',
  'face_recognition_model-shard2.bin'
];

// Download a file from URL to local path
function downloadFile(url, localPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(localPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
      
      file.on('error', (err) => {
        fs.unlink(localPath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', reject);
  });
}

// Check if all required models exist locally
function checkModelsExist() {
  const missingFiles = [];
  
  for (const fileName of REQUIRED_MODEL_FILES) {
    const filePath = path.join(modelsDir, fileName);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(fileName);
    }
  }
  
  return {
    allPresent: missingFiles.length === 0,
    missingFiles
  };
}

// Download missing models from CDN
async function downloadMissingModels(missingFiles) {
  const failedDownloads = [];
  
  console.log(`📥 Downloading ${missingFiles.length} missing model files...`);
  
  for (const fileName of missingFiles) {
    try {
      const url = `${CDN_BASE_URL}/${fileName}`;
      const localPath = path.join(modelsDir, fileName);
      
      console.log(`⬇️ Downloading ${fileName}...`);
      await downloadFile(url, localPath);
      console.log(`✅ Downloaded ${fileName}`);
      
    } catch (error) {
      console.error(`❌ Failed to download ${fileName}:`, error.message);
      failedDownloads.push(fileName);
    }
  }
  
  return {
    success: failedDownloads.length === 0,
    failedDownloads
  };
}

// Initialize models on startup
async function initializeModels() {
  console.log('🤖 Initializing face recognition models...');
  
  const modelCheck = checkModelsExist();
  
  if (modelCheck.allPresent) {
    console.log('✅ All face recognition models verified locally');
    return { ready: true, usingCDN: false };
  } else {
    console.warn(`⚠️ Missing models detected: ${modelCheck.missingFiles.join(', ')}`);
    
    const downloadResult = await downloadMissingModels(modelCheck.missingFiles);
    
    if (downloadResult.success) {
      console.log('✅ All missing models downloaded from CDN');
      return { ready: true, usingCDN: false };
    } else {
      console.warn(`⚠️ Failed to download: ${downloadResult.failedDownloads.join(', ')}`);
      console.warn('📡 Models will fallback to CDN at runtime');
      return { ready: true, usingCDN: true };
    }
  }
}

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
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend is running ✅',
    timestamp: new Date().toISOString(),
    port: PORT,
    database: 'connected'
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  // Accept either student_id or email for login to support frontend behavior
  const { student_id, email, password, adminKey } = req.body;
  if ((!student_id && !email) || !password) return res.status(400).json({ success: false, message: 'student_id/email and password required' });

  const lookupField = email ? 'email' : 'student_id';
  const lookupValue = email ? email : student_id;

  db.get(`SELECT * FROM users WHERE ${lookupField} = ?`, [lookupValue], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!user || !bcrypt.compareSync(password, user.password_hash || '')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Admin PIN check (set ADMIN_PIN in environment; do NOT hardcode in source)
    const adminPin = process.env.ADMIN_PIN || null;
    const isAdmin = adminPin && adminKey && adminKey === adminPin;

    // Include isAdmin in token payload
    const tokenPayload = { id: user.id, role: user.role, isAdmin };
    const token = jwt.sign(tokenPayload, JWT_SECRET);

    // Return token and user object compatible with frontend expectations
    res.status(200).json({ 
      success: true,
      message: "Login successful",
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        email: user.email, 
        student_id: user.student_id, 
        isAdmin 
      } 
    });
  });
});

// User registration endpoint
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, studentId } = req.body;
  
  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  
  // Validate DUT email format
  if (!email.toLowerCase().endsWith('@dut4life.ac.za')) {
    return res.status(400).json({ error: 'Only DUT emails (@dut4life.ac.za) are allowed' });
  }
  
  // Check if email already exists
  db.get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase()], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Check if student_id already exists (if provided)
    if (studentId) {
      db.get(`SELECT * FROM users WHERE student_id = ?`, [studentId], (err, existingStudent) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (existingStudent) {
          return res.status(400).json({ error: 'Student ID already registered' });
        }
        
        // Create the user
        createUser();
      });
    } else {
      // Create user without student_id check
      createUser();
    }
    
    function createUser() {
      // Hash password
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      // Determine role based on email (teachers vs students)
      let role = 'student';
      if (email.toLowerCase().includes('staff') || email.toLowerCase().includes('teacher') || email.toLowerCase().includes('lecturer')) {
        role = 'teacher';
      }
      
      // Insert new user
      db.run(
        `INSERT INTO users (student_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        [studentId || null, name, email.toLowerCase(), hashedPassword, role],
        function(err) {
          if (err) {
            return res.status(400).json({ error: err.message });
          }
          
          // Return success (don't auto-login, redirect to login page)
          res.json({ 
            message: 'Registration successful',
            userId: this.lastID,
            redirect: '/login'
          });
        }
      );
    }
  });
});

// Admin Key authentication endpoint
app.post('/api/auth/admin-key', (req, res) => {
  const { pin } = req.body;
  
  if (!pin) {
    return res.status(400).json({ success: false, message: 'PIN is required' });
  }

  // Hardcoded admin PIN as requested
  const ADMIN_PIN = '030702';
  
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ success: false, message: '❌ Invalid Admin Key.' });
  }

  // Check if admin user exists, create if not
  db.get(`SELECT * FROM users WHERE email = ?`, ['admin@dut4life.ac.za'], (err, existingUser) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (existingUser) {
      // Admin user exists, generate token
      const tokenPayload = { id: existingUser.id, role: 'admin', isAdmin: true };
      const token = jwt.sign(tokenPayload, JWT_SECRET);
      
      res.status(200).json({ 
        success: true,
        message: "Admin access granted",
        token, 
        user: { 
          id: existingUser.id, 
          name: existingUser.name, 
          role: 'admin', 
          email: existingUser.email, 
          student_id: existingUser.student_id, 
          isAdmin: true 
        } 
      });
    } else {
      // Create admin user
      const adminPassword = bcrypt.hashSync('admin123', 10); // Default password for admin
      db.run(
        `INSERT INTO users (student_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        ['admin', 'System Administrator', 'admin@dut4life.ac.za', adminPassword, 'admin'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Generate token for new admin user
          const tokenPayload = { id: this.lastID, role: 'admin', isAdmin: true };
          const token = jwt.sign(tokenPayload, JWT_SECRET);
          
          res.json({ 
            token, 
            user: { 
              id: this.lastID, 
              name: 'System Administrator', 
              role: 'admin', 
              email: 'admin@dut4life.ac.za', 
              student_id: 'admin', 
              isAdmin: true 
            } 
          });
        }
      );
    }
  });
});

// Middleware: require admin role (checks JWT.isAdmin)
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.isAdmin) return res.status(403).json({ error: 'Admin only' });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Example admin-only endpoint
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  res.json({ status: 'ok', admin: true, user: req.user });
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
    const MAX_PER_USER = 6;

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

// List enrolled face embeddings with user info (admin only)
app.get('/api/faces', requireAdmin, (req, res) => {
  db.all(`SELECT fe.id, fe.user_id, fe.embedding, fe.image_path, fe.confidence, fe.created_at, u.name, u.student_id
          FROM face_embeddings fe
          JOIN users u ON fe.user_id = u.id`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get user's own face embeddings
app.get('/api/user/faces', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    
    db.all(`SELECT id, embedding, image_path, confidence, created_at 
            FROM face_embeddings 
            WHERE user_id = ? 
            ORDER BY created_at DESC`, [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        faces: rows || [],
        maxFaces: 6,
        remainingSlots: Math.max(0, 6 - (rows?.length || 0))
      });
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Delete user's own face embedding
app.delete('/api/user/faces/:faceId', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    const faceId = req.params.faceId;
    
    // Verify the face belongs to the user
    db.get(`SELECT * FROM face_embeddings WHERE id = ? AND user_id = ?`, [faceId, userId], (err, face) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!face) return res.status(404).json({ error: 'Face not found or not authorized' });
      
      // Delete the face
      db.run(`DELETE FROM face_embeddings WHERE id = ? AND user_id = ?`, [faceId, userId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Face deleted successfully', deletedId: faceId });
      });
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// User self-enrollment (requires authentication)
app.post('/api/user/faces/enroll', upload.single('image'), (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    const { embedding, confidence } = req.body;
    const image_path = req.file ? req.file.path : null;
    
    // Use actual confidence from face detection, or default to reasonable value
    const actualConfidence = confidence && confidence > 0 ? confidence : 0.8;
    
    console.log('Face enrollment confidence:', { confidence, actualConfidence });

    if (!embedding) return res.status(400).json({ error: 'Face embedding required' });

    // Check face limit for user
    db.get(`SELECT COUNT(*) as count FROM face_embeddings WHERE user_id = ?`, [userId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      const existing = row?.count || 0;
      const MAX_PER_USER = 6;

      if (existing >= MAX_PER_USER) {
        return res.status(400).json({ error: `Face enrollment limit reached: max ${MAX_PER_USER} faces per user` });
      }

      const embStr = typeof embedding === 'string' ? embedding : JSON.stringify(embedding);
      db.run(`INSERT INTO face_embeddings (user_id, embedding, image_path, confidence) VALUES (?, ?, ?, ?)`,
        [userId, embStr, image_path, actualConfidence],
        function (err) {
          if (err) return res.status(400).json({ error: err.message });
          res.json({
            id: this.lastID,
            user_id: userId,
            embedding: embStr,
            image_path,
            confidence: Number(actualConfidence),
            remaining_slots: MAX_PER_USER - existing - 1
          });
        });
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/faces/recognize', (req, res) => {
  const { embedding, threshold = 0.7 } = req.body; // Increased threshold for better accuracy
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  
  console.log('Recognition request received:', { 
    threshold,
    embeddingType: typeof embedding,
    isArray: Array.isArray(embedding),
    length: embedding?.length,
    hasToken: !!token
  });
  
  if (!embedding) return res.status(400).json({ error: 'Face embedding required' });
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  // Verify token and get user ID
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    
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

    // Get ONLY the logged-in user's faces
    db.all(`SELECT fe.*, u.name, u.student_id, u.email 
            FROM face_embeddings fe 
            JOIN users u ON fe.user_id = u.id 
            WHERE fe.user_id = ?`,
      [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        let best = null;
        let bestSim = 0;

        console.log(`Comparing against ${rows.length} stored faces for user ${userId}`);
        
        if (rows.length === 0) {
          return res.json({
            recognized: false,
            name: '❓ No faces enrolled',
            similarity: 0.0,
            confidence: 0.0,
            message: 'No faces enrolled for this user'
          });
        }
        
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
            confidence: bestSim * 100,
            message: `✅ Recognized as ${best.name}`
          });
        }

        res.json({
          recognized: false,
          name: '❓ Unknown Face',
          similarity: bestSim,
          confidence: bestSim * 100,
          message: '❓ Unknown Face',
          threshold: threshold
        });
      });
    
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
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

// Recognition configuration
app.get('/api/recognition/config', (req, res) => {
  res.json({
    defaultThreshold: 0.7,
    minThreshold: 0.5,
    maxThreshold: 0.95,
    description: 'Confidence threshold for face recognition (0.5 = 50%, 0.7 = 70%, etc.)'
  });
});

app.post('/api/recognition/config', (req, res) => {
  const { threshold } = req.body;
  if (typeof threshold !== 'number' || threshold < 0.5 || threshold > 0.95) {
    return res.status(400).json({ error: 'Threshold must be between 0.5 and 0.95' });
  }
  
  // In a real app, you'd save this to a config file or database
  // For now, we'll just return success
  res.json({ 
    success: true, 
    message: `Confidence threshold updated to ${(threshold * 100).toFixed(1)}%`,
    threshold: threshold
  });
});

// Model management endpoints
app.get('/api/models/status', (req, res) => {
  const modelCheck = checkModelsExist();
  res.json({
    allPresent: modelCheck.allPresent,
    missingFiles: modelCheck.missingFiles,
    totalRequired: REQUIRED_MODEL_FILES.length,
    presentCount: REQUIRED_MODEL_FILES.length - modelCheck.missingFiles.length
  });
});

app.post('/api/models/download', async (req, res) => {
  try {
    const modelCheck = checkModelsExist();
    if (modelCheck.allPresent) {
      return res.json({ success: true, message: 'All models already present' });
    }
    
    const downloadResult = await downloadMissingModels(modelCheck.missingFiles);
    res.json({
      success: downloadResult.success,
      downloaded: modelCheck.missingFiles.filter(f => !downloadResult.failedDownloads.includes(f)),
      failed: downloadResult.failedDownloads,
      message: downloadResult.success ? 'All models downloaded successfully' : 'Some models failed to download'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics Dashboard API
app.get('/api/analytics/dashboard', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin' && decoded.role !== 'teacher') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all users
    db.all('SELECT id, name, student_id, role FROM users WHERE role = "student"', [], (err, users) => {
      if (err) return res.status(500).json({ error: err.message });

      const totalStudents = users.length;
      
      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      db.all(`
        SELECT DISTINCT user_id, name, student_id, timestamp, status
        FROM attendance_records al
        JOIN users u ON al.user_id = u.id
        WHERE DATE(timestamp) = ? AND status = 'present'
      `, [today], (err, todayAttendance) => {
        if (err) return res.status(500).json({ error: err.message });

        const presentToday = todayAttendance.length;
        const attendanceRate = totalStudents > 0 ? (presentToday / totalStudents) * 100 : 0;

        // Calculate performance grade
        let performanceGrade = 'F';
        if (attendanceRate >= 90) performanceGrade = 'A+';
        else if (attendanceRate >= 80) performanceGrade = 'A';
        else if (attendanceRate >= 70) performanceGrade = 'B';
        else if (attendanceRate >= 60) performanceGrade = 'C';
        else if (attendanceRate >= 50) performanceGrade = 'D';

        // Get top performers (users with highest attendance rates)
        db.all(`
          SELECT u.id, u.name, u.student_id,
                 COUNT(CASE WHEN al.status = 'present' THEN 1 END) as present_count,
                 COUNT(al.id) as total_sessions
          FROM users u
          LEFT JOIN attendance_records al ON u.id = al.user_id
          WHERE u.role = 'student'
          GROUP BY u.id, u.name, u.student_id
          HAVING total_sessions > 0
          ORDER BY (present_count * 1.0 / total_sessions) DESC
          LIMIT 5
        `, [], (err, topPerformers) => {
          if (err) return res.status(500).json({ error: err.message });

          const formattedTopPerformers = topPerformers.map(p => ({
            name: p.name,
            student_id: p.student_id,
            attendanceRate: p.total_sessions > 0 ? (p.present_count / p.total_sessions) * 100 : 0
          }));

          // Get recent activity (last 10 attendance records)
          db.all(`
            SELECT u.name, u.student_id, al.timestamp, al.status
            FROM attendance_records al
            JOIN users u ON al.user_id = u.id
            ORDER BY al.timestamp DESC
            LIMIT 10
          `, [], (err, recentActivity) => {
            if (err) return res.status(500).json({ error: err.message });

            // Get daily attendance for the last 7 days
            db.all(`
              SELECT DATE(timestamp) as date,
                     COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                     COUNT(DISTINCT user_id) as total
              FROM attendance_records
              WHERE timestamp >= date('now', '-7 days')
              GROUP BY DATE(timestamp)
              ORDER BY date DESC
            `, [], (err, dailyAttendance) => {
              if (err) return res.status(500).json({ error: err.message });

              res.json({
                attendanceRate: Math.round(attendanceRate * 100) / 100,
                presentToday,
                totalStudents,
                performanceGrade,
                topPerformers: formattedTopPerformers,
                recentActivity: recentActivity.map(a => ({
                  name: a.name,
                  student_id: a.student_id,
                  timestamp: a.timestamp,
                  status: a.status
                })),
                dailyAttendance: dailyAttendance.map(d => ({
                  date: d.date,
                  present: d.present,
                  total: d.total
                }))
              });
            });
          });
        });
      });
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Get user's face embeddings (admin view)
app.get('/api/user/faces', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId } = req.query;
    
    // Check if admin or requesting own data
    if (decoded.role !== 'admin' && decoded.role !== 'teacher' && decoded.id != userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const targetUserId = userId || decoded.id;
    
    db.all('SELECT * FROM face_embeddings WHERE user_id = ? ORDER BY created_at DESC', [targetUserId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        faces: rows,
        maxFaces: 6,
        remainingSlots: Math.max(0, 6 - rows.length)
      });
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Get user's attendance records
app.get('/api/user/attendance/:userId', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId } = req.params;
    
    // Check if admin or requesting own data
    if (decoded.role !== 'admin' && decoded.role !== 'teacher' && decoded.id != userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.all(`
      SELECT al.*, s.name as class_name
            FROM attendance_records al
      LEFT JOIN attendance_sessions s ON al.session_id = s.id
      WHERE al.user_id = ?
      ORDER BY al.timestamp DESC
      LIMIT 100
    `, [userId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        records: rows
      });
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Start server and initialize models
async function startServer() {
  try {
    // Initialize models first
    await initializeModels();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
      console.log(`📊 Database: ${dbPath}`);
      console.log(`📁 Uploads: ${uploadsDir}`);
      console.log(`🤖 Models: ${modelsDir}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

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
