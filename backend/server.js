const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic CORS: allow localhost for dev AND the production Vercel frontend URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://stream-flix-eosin.vercel.app'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy: origin '${origin}' not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Ensure uploads directories exist
const uploadDirs = [
  path.join(__dirname, 'public/uploads/videos'),
  path.join(__dirname, 'public/uploads/thumbnails'),
];
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configure Multer Storage for Admin Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, path.join(__dirname, 'public/uploads/videos'));
    } else if (file.fieldname === 'thumbnail') {
      cb(null, path.join(__dirname, 'public/uploads/thumbnails'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// --- Movie API Routes ---

// Get all movies
app.get('/api/movies', (req, res) => {
  const { category, search } = req.query;
  let query = 'SELECT * FROM movies WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    query += ' AND LOWER(category) = LOWER(?)';
    params.push(category);
  }

  if (search) {
    query += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
    const searchParam = `%${search.toLowerCase()}%`;
    params.push(searchParam, searchParam);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Convert trending 1/0 to true/false for frontend
    const result = rows.map((row) => ({
      ...row,
      trending: row.trending === 1,
    }));
    res.json(result);
  });
});

// Get single movie
app.get('/api/movies/:id', (req, res) => {
  db.get('SELECT * FROM movies WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json({ ...row, trending: row.trending === 1 });
  });
});

// --- Auth Routes ---

// Register User
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  db.run(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, password],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, username });
    }
  );
});

// Login User
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      res.json({ id: row.id, username: row.username });
    }
  );
});

// --- Watchlist Routes ---

// Get Watchlist
app.get('/api/watchlist/:userId', (req, res) => {
  const query = `
    SELECT m.* FROM movies m
    INNER JOIN watchlist w ON m.id = w.movieId
    WHERE w.userId = ?
  `;
  db.all(query, [req.params.userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map((row) => ({ ...row, trending: row.trending === 1 })));
  });
});

// Toggle Watchlist Item
app.post('/api/watchlist/toggle', (req, res) => {
  const { userId, movieId } = req.body;
  if (!userId || !movieId) {
    return res.status(400).json({ message: 'userId and movieId required' });
  }

  db.get(
    'SELECT * FROM watchlist WHERE userId = ? AND movieId = ?',
    [userId, movieId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (row) {
        // Remove
        db.run(
          'DELETE FROM watchlist WHERE userId = ? AND movieId = ?',
          [userId, movieId],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ added: false, message: 'Removed from watchlist' });
          }
        );
      } else {
        // Add
        db.run(
          'INSERT INTO watchlist (userId, movieId) VALUES (?, ?)',
          [userId, movieId],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ added: true, message: 'Added to watchlist' });
          }
        );
      }
    }
  );
});

// --- Admin Upload Routes ---

app.post(
  '/api/admin/upload',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  (req, res) => {
    const { title, description, category, duration, year, trending } = req.body;
    
    if (!req.files || !req.files.video || !req.files.thumbnail) {
      return res.status(400).json({ message: 'Video and thumbnail files are required' });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail[0];

    // Generate static server URLs for uploads
    const videoUrl = `/uploads/videos/${videoFile.filename}`;
    const thumbnailUrl = `/uploads/thumbnails/${thumbnailFile.filename}`;

    db.run(
      `INSERT INTO movies (title, description, category, thumbnail, videoUrl, duration, rating, year, trending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        category,
        thumbnailUrl,
        videoUrl,
        duration || '10:00',
        '4.5',
        year || new Date().getFullYear().toString(),
        trending === 'true' || trending === '1' ? 1 : 0,
      ],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          message: 'Movie uploaded successfully',
          movieId: this.lastID,
        });
      }
    );
  }
);

// --- Admin URL-only Route (For Google Drive / external video URLs) ---
app.post('/api/admin/add-url', (req, res) => {
  const { title, description, category, duration, year, trending, videoUrl, thumbnailUrl } = req.body;

  if (!title || !description || !videoUrl || !thumbnailUrl) {
    return res.status(400).json({ message: 'Title, description, videoUrl and thumbnailUrl are all required.' });
  }

  db.run(
    `INSERT INTO movies (title, description, category, thumbnail, videoUrl, duration, rating, year, trending)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description,
      category || 'Action',
      thumbnailUrl,
      videoUrl,
      duration || '10:00',
      '4.5',
      year || new Date().getFullYear().toString(),
      trending ? 1 : 0,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Movie added successfully via URL',
        movieId: this.lastID,
      });
    }
  );
});

// --- Video Stream Proxy & Range Streamer ---
app.get('/api/stream/:id', (req, res) => {
  db.get('SELECT videoUrl FROM movies WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ message: 'Video not found' });
    }

    let videoUrl = row.videoUrl;

    // Handle relative local upload paths (e.g. /uploads/videos/...)
    if (videoUrl.startsWith('/uploads')) {
      // Local file
      const videoPath = path.join(__dirname, 'public', videoUrl);
      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ message: 'Video file on server not found' });
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
          return;
        }

        const chunksize = end - start + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };

        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    } else {
      // Redirect to external Google bucket URL or online media URL
      res.redirect(videoUrl);
    }
  });
});

app.listen(PORT, () => {
  console.log(`StreamFlix backend server running on http://localhost:${PORT}`);
});
