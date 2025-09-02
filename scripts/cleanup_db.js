const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '..', 'facial_recognition.db');

console.log('Cleaning up database and ensuring only real users exist...');

const db = new sqlite3.Database(dbPath, async (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

// First, remove any test/fake users
const removeTestUsers = () => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM users WHERE student_id NOT IN ('admindut', 'monwabisi', 'mogale')`,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Ensure our real users exist
const ensureRealUsers = () => {
  return new Promise((resolve, reject) => {
    const users = [
      {
        student_id: 'admindut',
        name: 'Admin DUT',
        email: 'admindut@dut4life.ac.za',
        password: '1234',
        role: 'teacher'
      },
      {
        student_id: 'monwabisi',
        name: 'Monwabisi',
        email: 'monwabisi@student.dut.ac.za',
        password: '1234',
        role: 'student'
      },
      {
        student_id: 'mogale',
        name: 'Mogale',
        email: 'mogale@student.dut.ac.za',
        password: '1234',
        role: 'student'
      }
    ];

    const stmt = db.prepare(
      `INSERT OR REPLACE INTO users (student_id, name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const user of users) {
      const hash = bcrypt.hashSync(user.password, 10);
      stmt.run(user.student_id, user.name, user.email, hash, user.role, (err) => {
        if (err) reject(err);
      });
    }

    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Clean up face embeddings for non-existent users
const cleanupEmbeddings = () => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM face_embeddings WHERE user_id NOT IN (SELECT id FROM users)`,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

// Run the cleanup process
async function cleanup() {
  try {
    await removeTestUsers();
    console.log('✅ Removed test/fake users');
    
    await ensureRealUsers();
    console.log('✅ Ensured real users exist');
    
    await cleanupEmbeddings();
    console.log('✅ Cleaned up face embeddings');
    
    console.log('Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    db.close();
  }
}

cleanup();
