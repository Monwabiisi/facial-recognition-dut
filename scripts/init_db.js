const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '..', 'facial_recognition.db');

// Remove existing DB only if you intentionally want a clean slate.
// Here we recreate tables and seed admin without dropping existing user data.
console.log('Initializing DB at', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  // Users table (with password_hash)
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

  // Face embeddings
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

  // Classes
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

  // Attendance sessions
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

  // Attendance records
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

  // Seed admin user if no teacher exists
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'teacher'", (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err.message);
  db.close();
  return;
    }
    const count = row?.count || 0;
    if (count === 0) {
      const adminStudentId = 'admindut';
      const adminEmail = 'admindut@dut4life.ac.za';
      const adminName = 'Admin DUT';
      const adminPassword = '1234';
      const hash = bcrypt.hashSync(adminPassword, 10);

      // Use INSERT OR IGNORE in case a row with the same student_id/email exists from another process
      db.run(
        `INSERT OR IGNORE INTO users (student_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        [adminStudentId, adminName, adminEmail, hash, 'teacher'],
        function (err) {
          if (err) {
            console.error('Failed to insert admin:', err.message);
          } else if (this.changes === 0) {
            console.log('Admin already exists (insert skipped)');
          } else {
            console.log('Admin user created (student_id: admindut, password: 1234)');
          }
          db.close((cerr) => {
            if (cerr) console.error('Error closing DB:', cerr.message);
            else console.log('Database initialization finished.');
          });
        }
      );
    } else {
      console.log('Admin (teacher) user already present, skipping seed.');
      db.close((cerr) => {
        if (cerr) console.error('Error closing DB:', cerr.message);
        else console.log('Database initialization finished.');
      });
    }
  });
});
