require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');

const fileController = require('./controllers/fileController');
const { authenticate } = require('./middleware/auth');
const { cacheMiddleware, clearCache } = require('./middleware/cache');
const { uploadLimiter, downloadLimiter, apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE) || 50) * 1024 * 1024,
  },
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============ CDN Routes (Public) ============

// Serve file by ID
app.get('/cdn/:fileId', downloadLimiter, cacheMiddleware(86400), fileController.serve);

// Serve file by ID with filename
app.get('/cdn/:fileId/:filename', downloadLimiter, cacheMiddleware(86400), fileController.serve);

// Download file
app.get('/download/:fileId', downloadLimiter, fileController.download);

// ============ API Routes (Protected) ============

// Apply authentication to all /api routes
app.use('/api', authenticate, apiLimiter);

// Upload single file
app.post('/api/upload', uploadLimiter, upload.single('file'), fileController.upload);

// Upload multiple files
app.post('/api/upload/multiple', uploadLimiter, upload.array('files', 10), fileController.uploadMultiple);

// Get file info
app.get('/api/file/:fileId', cacheMiddleware(300), fileController.getInfo);

// Delete file
app.delete('/api/file/:fileId', fileController.delete);

// List all files
app.get('/api/files', cacheMiddleware(60), fileController.list);

// Search files
app.get('/api/files/search', fileController.search);

// Get storage stats
app.get('/api/stats', cacheMiddleware(300), fileController.stats);

// Clear cache endpoint
app.post('/api/cache/clear', (req, res) => {
  clearCache(req.body.pattern);
  res.json({ success: true, message: 'Cache cleared' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CDN Server running on port ${PORT}`);
  console.log(`📁 Google Drive Folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
});
