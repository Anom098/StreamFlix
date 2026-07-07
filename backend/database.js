const { Pool } = require('pg');
const initialMovies = require('./data/movies.json');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Movies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        thumbnail TEXT,
        "videoUrl" TEXT,
        duration TEXT,
        rating TEXT,
        year TEXT,
        trending INTEGER DEFAULT 0
      )
    `);

    // 2. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "isAdmin" INTEGER DEFAULT 0
      )
    `);

    // 3. Watchlist Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        "userId" INTEGER,
        "movieId" INTEGER,
        PRIMARY KEY ("userId", "movieId"),
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY ("movieId") REFERENCES movies(id) ON DELETE CASCADE
      )
    `);

    await client.query('COMMIT');
    console.log('Tables initialized successfully.');

    await seedMovies(client);
    await ensureAdminUser(client);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error initializing tables:', err);
  } finally {
    client.release();
  }
}

async function seedMovies(client) {
  const { rows } = await client.query('SELECT COUNT(*) as count FROM movies');
  if (parseInt(rows[0].count) === 0) {
    console.log('Seeding initial movies...');
    for (const movie of initialMovies) {
      await client.query(
        `INSERT INTO movies (title, description, category, thumbnail, "videoUrl", duration, rating, year, trending)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [movie.title, movie.description, movie.category, movie.thumbnail,
         movie.videoUrl, movie.duration, movie.rating, movie.year, movie.trending ? 1 : 0]
      );
    }
    console.log('Database seeded successfully!');
  }
}

async function ensureAdminUser(client) {
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  await client.query(
    `INSERT INTO users (username, password, "isAdmin") VALUES ($1, $2, 1)
     ON CONFLICT (username) DO NOTHING`,
    [adminUser, adminPass]
  );
  console.log(`Admin user '${adminUser}' ensured.`);
}

// Initialize on startup
initTables().catch(console.error);

// Promisified helpers matching the sqlite3 interface style
const db = {
  all: (query, params, callback) => {
    pool.query(query, params)
      .then(result => callback(null, result.rows))
      .catch(err => callback(err));
  },
  get: (query, params, callback) => {
    pool.query(query, params)
      .then(result => callback(null, result.rows[0] || null))
      .catch(err => callback(err));
  },
  run: (query, params, callback) => {
    pool.query(query, params)
      .then(result => {
        // Mimic sqlite3 `this` context with lastID and changes
        const ctx = {
          lastID: result.rows[0] ? result.rows[0].id : null,
          changes: result.rowCount,
        };
        if (callback) callback.call(ctx, null);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  },
};

module.exports = db;
