const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../facial_recognition.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT id, student_id, name, email, role, password_hash FROM users', [], (err, rows) => {
  if (err) {
    console.error('DB error', err.message);
    process.exit(1);
  }
  console.log('USERS:', JSON.stringify(rows, null, 2));
  db.close();
});
