import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
const PORT = process.env.PORT || 3000;

// Static frontend
app.use(express.static('protend'));

// Ensure upload dir
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

function fileFilter(req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image uploads are allowed'));
  }
}

const upload = multer({ storage, fileFilter, limits: { files: 250, fileSize: 20 * 1024 * 1024 } });

// DB setup
let db;
async function initDb() {
  db = await open({ filename: path.resolve('database.sqlite'), driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS project_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      lat TEXT,
      lng TEXT,
      notes TEXT
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS project_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_media_id INTEGER,
      path TEXT,
      original_name TEXT,
      FOREIGN KEY(project_media_id) REFERENCES project_media(id)
    );
  `);
}

app.post('/api/new-project', upload.array('images', 250), async (req, res) => {
  try {
    const { lat = '', lng = '', notes = '' } = req.body;
    const result = await db.run('INSERT INTO project_media (lat, lng, notes) VALUES (?, ?, ?)', [lat, lng, notes]);
    const mediaId = result.lastID;

    if (Array.isArray(req.files)) {
      const insertImg = await db.prepare('INSERT INTO project_images (project_media_id, path, original_name) VALUES (?, ?, ?)');
      for (const f of req.files) {
        await insertImg.run(mediaId, f.path, f.originalname);
      }
      await insertImg.finalize();
    }

    res.json({ ok: true, id: mediaId });
  } catch (e) {
    console.error(e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.get('/api/new-project/:id', async (req, res) => {
  try {
    const media = await db.get('SELECT * FROM project_media WHERE id = ?', req.params.id);
    const images = await db.all('SELECT id, path, original_name FROM project_images WHERE project_media_id = ?', req.params.id);
    res.json({ ok: true, media, images });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});

