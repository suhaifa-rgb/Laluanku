import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

// Database pool
const dbPool = mysql.createPool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT || 3306),
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0
});

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// Middlewares
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
	origin: function(origin, callback) {
		if (!origin) return callback(null, true);
		if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		return callback(new Error('Not allowed by CORS'));
	}
}));

app.use(morgan('dev'));

// Serve static
app.use('/uploads', express.static(uploadDir));
app.use('/', express.static(path.resolve(__dirname, '../client/public')));
app.use('/src', express.static(path.resolve(__dirname, '../client/src')));

// Multer storage
const storage = multer.diskStorage({
	destination: function(req, file, cb) {
		cb(null, uploadDir);
	},
	filename: function(req, file, cb) {
		const ext = path.extname(file.originalname);
		cb(null, `${uuidv4()}${ext}`);
	}
});

const upload = multer({
	storage,
	limits: { files: Number(process.env.MAX_IMAGES_PER_PATROL || 250), fileSize: 40 * 1024 * 1024 }
});

// Bootstrap schema
async function bootstrapSchema() {
	const conn = await dbPool.getConnection();
	try {
		await conn.query(`
			CREATE TABLE IF NOT EXISTS patrol_reports (
				id CHAR(36) PRIMARY KEY,
				notes TEXT,
				start_lat DOUBLE NULL,
				start_lng DOUBLE NULL,
				end_lat DOUBLE NULL,
				end_lng DOUBLE NULL,
				total_distance_km DOUBLE DEFAULT 0,
				total_time_min INT DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`);
		await conn.query(`
			CREATE TABLE IF NOT EXISTS patrol_media (
				id CHAR(36) PRIMARY KEY,
				report_id CHAR(36) NOT NULL,
				file_path VARCHAR(255) NOT NULL,
				thumb_path VARCHAR(255) NULL,
				media_type ENUM('image','video') NOT NULL DEFAULT 'image',
				latitude DOUBLE NULL,
				longitude DOUBLE NULL,
				taken_at DATETIME NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				INDEX (report_id),
				FOREIGN KEY (report_id) REFERENCES patrol_reports(id) ON DELETE CASCADE
			);
		`);
	} finally {
		conn.release();
	}
}

// Helpers
async function createThumbnailIfImage(srcPath, destPath) {
	try {
		await sharp(srcPath).rotate().resize(600).jpeg({ quality: 80 }).toFile(destPath);
		return true;
	} catch (e) {
		return false;
	}
}

// Routes
app.get('/api/health', (req, res) => {
	res.json({ ok: true });
});

// Create new report with images and optional video
app.post('/api/reports', upload.array('images', Number(process.env.MAX_IMAGES_PER_PATROL || 250)), async (req, res) => {
	const connection = await dbPool.getConnection();
	try {
		const reportId = uuidv4();
		const { notes, startLat, startLng, endLat, endLng, totalDistanceKm, totalTimeMin, mediaMeta } = req.body;
		await connection.beginTransaction();
		await connection.query(
			`INSERT INTO patrol_reports (id, notes, start_lat, start_lng, end_lat, end_lng, total_distance_km, total_time_min) VALUES (?,?,?,?,?,?,?,?)`,
			[
				reportId,
				notes || null,
				startLat ? Number(startLat) : null,
				startLng ? Number(startLng) : null,
				endLat ? Number(endLat) : null,
				endLng ? Number(endLng) : null,
				totalDistanceKm ? Number(totalDistanceKm) : 0,
				totalTimeMin ? Number(totalTimeMin) : 0
			]
		);

		const meta = mediaMeta ? JSON.parse(mediaMeta) : {};
		for (const file of req.files || []) {
			const id = uuidv4();
			const src = file.filename;
			const srcFull = path.join(uploadDir, src);
			const thumb = `${path.parse(src).name}_thumb.jpg`;
			const thumbFull = path.join(uploadDir, thumb);
			await createThumbnailIfImage(srcFull, thumbFull);
			const m = meta[file.originalname] || {};
			await connection.query(
				`INSERT INTO patrol_media (id, report_id, file_path, thumb_path, media_type, latitude, longitude, taken_at) VALUES (?,?,?,?,?,?,?,?)`,
				[
					id,
					reportId,
					`/uploads/${src}`,
					`/uploads/${thumb}`,
					'image',
					m.lat ? Number(m.lat) : null,
					m.lng ? Number(m.lng) : null,
					m.takenAt ? new Date(m.takenAt) : null
				]
			);
		}

		await connection.commit();
		res.json({ id: reportId, ok: true });
	} catch (err) {
		await connection.rollback();
		console.error(err);
		res.status(500).json({ ok: false, error: 'Failed to save report' });
	} finally {
		connection.release();
	}
});

// Fetch report with media and computed stats
app.get('/api/reports/:id', async (req, res) => {
	const reportId = req.params.id;
	const conn = await dbPool.getConnection();
	try {
		const [reports] = await conn.query('SELECT * FROM patrol_reports WHERE id=?', [reportId]);
		if (reports.length === 0) return res.status(404).json({ ok: false, error: 'Not found' });
		const report = reports[0];
		const [media] = await conn.query('SELECT * FROM patrol_media WHERE report_id=? ORDER BY taken_at ASC, created_at ASC', [reportId]);
		res.json({ ok: true, report, media });
	} catch (e) {
		console.error(e);
		res.status(500).json({ ok: false, error: 'Failed to fetch report' });
	} finally {
		conn.release();
	}
});

// Bootstrap then start (non-fatal if DB not reachable at boot)
bootstrapSchema()
	.then(() => {
		console.log('Database schema ensured.');
	})
	.catch((e) => {
		console.warn('Warning: Failed to bootstrap schema at startup. The API will require DB later.', e.message);
	})
	.finally(() => {
		app.listen(port, () => {
			console.log(`Laluanku server listening on http://localhost:${port}`);
		});
	});

