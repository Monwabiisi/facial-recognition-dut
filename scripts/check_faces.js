const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, "..", "facial_recognition.db");
const db = new sqlite3.Database(dbPath);

db.all(`
  SELECT fe.*, u.name, u.student_id 
  FROM face_embeddings fe 
  JOIN users u ON fe.user_id = u.id
`, [], (err, rows) => {
  if (err) {
    console.error("Error:", err.message);
  } else {
    console.log("FACE EMBEDDINGS:", JSON.stringify(rows, null, 2));
  }
  db.close();
});
