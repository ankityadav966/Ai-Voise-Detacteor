const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  createRecording,
  getRecordings,
  getRecordingById,
  updateRecording,
  toggleFavorite,
  deleteRecording,
  regenerateAnalysis,
} = require('../controllers/recordingController');

// Multer Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter validator (supports standard audio types including webm and ogg for modern browsers)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 
    'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/aac', 
    'audio/x-aac', 'audio/webm', 'audio/x-webm', 'audio/ogg', 
    'audio/x-ogg', 'application/octet-stream'
  ];
  if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|aac|webm|ogg)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio file uploads are supported (mp3, wav, m4a, aac, webm, ogg).'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB max
});

// Apply protect middleware to all recording operations
router.use(protect);

// Core Recording routes
router.post('/upload', apiLimiter, upload.single('audio'), createRecording);
router.get('/', getRecordings);
router.get('/:id', getRecordingById);
router.put('/:id', updateRecording);
router.delete('/:id', deleteRecording);

// AI & Favorites toggles
router.put('/:id/favorite', toggleFavorite);
router.post('/:id/regenerate', regenerateAnalysis);

module.exports = router;
