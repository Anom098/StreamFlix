const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const initialMovies = require('./data/movies.json');

const dbPath = path.join(__dirname, 'streamflix.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initTables();
  }
});

function initTables() {
  db.serialize(() => {
    // 1. Movies Table
    db.run(`
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        thumbnail TEXT,
        videoUrl TEXT,
        duration TEXT,
        rating TEXT,
        year TEXT,
        trending INTEGER DEFAULT 0
      )
    `);

    // 2. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        isAdmin INTEGER DEFAULT 0
      )
    `, () => {
      // Add isAdmin column to existing databases that don't have it
      db.run(`ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0`, () => {});
      // Ensure default admin account always exists
      db.run(
        `INSERT OR IGNORE INTO users (username, password, isAdmin) VALUES (?, ?, 1)`,
        [process.env.ADMIN_USERNAME || 'admin', process.env.ADMIN_PASSWORD || 'admin123']
      );
    });

    // 3. Watchlist Table
    db.run(`
      CREATE TABLE IF NOT EXISTS watchlist (
        userId INTEGER,
        movieId INTEGER,
        PRIMARY KEY (userId, movieId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (movieId) REFERENCES movies(id) ON DELETE CASCADE
      )
    `, () => {
      seedMovies();
    });
  });
}

function seedMovies() {
  db.get('SELECT COUNT(*) as count FROM movies', (err, row) => {
    if (err) {
      console.error('Error checking movies count:', err);
      return;
    }

    if (row.count === 0) {
      console.log('Seeding initial movies database...');
      const stmt = db.prepare(`
        INSERT INTO movies (title, description, category, thumbnail, videoUrl, duration, rating, year, trending)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      initialMovies.forEach((movie) => {
        stmt.run(
          movie.title,
          movie.description,
          movie.category,
          movie.thumbnail,
          movie.videoUrl,
          movie.duration,
          movie.rating,
          movie.year,
          movie.trending ? 1 : 0
        );
      });

      stmt.finalize();
      console.log('Database seeded successfully!');
    }
  });
}

module.exports = db;
