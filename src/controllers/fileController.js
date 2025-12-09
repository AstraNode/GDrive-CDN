const driveService = require('../services/driveService');
const { validateFileType, formatFileSize, getFileCategory, generateCdnUrl } = require('../utils/helpers');
const { clearCache } = require('../middleware/cache');

class FileController {
  /**
   * Upload a file
   * POST /api/upload
   */
  async upload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
        });
      }

      const { file } = req;
      const maxSize = (parseInt(process.env.MAX_FILE_SIZE) || 50) * 1024 * 1024;

      // Validate file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds maximum limit of ${process.env.MAX_FILE_SIZE || 50}MB`,
        });
      }

      // Validate file type
      if (!validateFileType(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'File type not allowed',
        });
      }

      const customName = req.body.name || null;
      const result = await driveService.uploadFile(file, customName);

      res.status(201).json({
        success: true,
        data: {
          ...result,
          url: generateCdnUrl(req, result.id),
          directUrl: generateCdnUrl(req, result.id, result.name),
          category: getFileCategory(result.mimeType),
          formattedSize: formatFileSize(parseInt(result.size)),
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file',
        message: error.message,
      });
    }
  }

  /**
   * Upload multiple files
   * POST /api/upload/multiple
   */
  async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided',
        });
      }

      const results = [];
      const errors = [];

      for (const file of req.files) {
        try {
          if (!validateFileType(file.mimetype)) {
            errors.push({ name: file.originalname, error: 'File type not allowed' });
            continue;
          }

          const result = await driveService.uploadFile(file);
          results.push({
            ...result,
            url: generateCdnUrl(req, result.id),
            directUrl: generateCdnUrl(req, result.id, result.name),
          });
        } catch (err) {
          errors.push({ name: file.originalname, error: err.message });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          uploaded: results,
          failed: errors,
          total: req.files.length,
          successful: results.length,
        },
      });
    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload files',
      });
    }
  }

  /**
   * Serve file (CDN endpoint)
   * GET /cdn/:fileId
   */
  async serve(req, res) {
    try {
      const { fileId } = req.params;

      // Get file info first
      const fileInfo = await driveService.getFileInfo(fileId);

      // Get file stream
      const stream = await driveService.getFileStream(fileId);

      // Set headers
      res.set({
        'Content-Type': fileInfo.mimeType,
        'Content-Disposition': `inline; filename="${fileInfo.name}"`,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      });

      stream.pipe(res);
    } catch (error) {
      console.error('Serve error:', error);
      if (error.code === 404) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to serve file',
      });
    }
  }

  /**
   * Download file with original name
   * GET /download/:fileId
   */
  async download(req, res) {
    try {
      const { fileId } = req.params;
      const fileInfo = await driveService.getFileInfo(fileId);
      const stream = await driveService.getFileStream(fileId);

      res.set({
        'Content-Type': fileInfo.mimeType,
        'Content-Disposition': `attachment; filename="${fileInfo.name}"`,
      });

      stream.pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download file',
      });
    }
  }

  /**
   * Get file info
   * GET /api/file/:fileId
   */
  async getInfo(req, res) {
    try {
      const { fileId } = req.params;
      const fileInfo = await driveService.getFileInfo(fileId);

      res.json({
        success: true,
        data: {
          ...fileInfo,
          url: generateCdnUrl(req, fileId),
          formattedSize: formatFileSize(parseInt(fileInfo.size)),
          category: getFileCategory(fileInfo.mimeType),
        },
      });
    } catch (error) {
      console.error('Get info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file info',
      });
    }
  }

  /**
   * Delete file
   * DELETE /api/file/:fileId
   */
  async delete(req, res) {
    try {
      const { fileId } = req.params;
      await driveService.deleteFile(fileId);
      
      // Clear cache for this file
      clearCache(fileId);

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file',
      });
    }
  }

  /**
   * List all files
   * GET /api/files
   */
  async list(req, res) {
    try {
      const { pageSize = 50, pageToken } = req.query;
      const result = await driveService.listFiles(parseInt(pageSize), pageToken);

      const files = result.files.map(file => ({
        ...file,
        url: generateCdnUrl(req, file.id),
        formattedSize: formatFileSize(parseInt(file.size || 0)),
        category: getFileCategory(file.mimeType),
      }));

      res.json({
        success: true,
        data: {
          files,
          nextPageToken: result.nextPageToken,
          count: files.length,
        },
      });
    } catch (error) {
      console.error('List error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list files',
      });
    }
  }

  /**
   * Search files
   * GET /api/files/search
   */
  async search(req, res) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }

      const files = await driveService.searchFiles(q);

      res.json({
        success: true,
        data: files.map(file => ({
          ...file,
          url: generateCdnUrl(req, file.id),
        })),
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search files',
      });
    }
  }

  /**
   * Get storage stats
   * GET /api/stats
   */
  async stats(req, res) {
    try {
      const quota = await driveService.getStorageStats();
      const { files } = await driveService.listFiles(1000);

      res.json({
        success: true,
        data: {
          storage: {
            used: formatFileSize(parseInt(quota.usage)),
            total: formatFileSize(parseInt(quota.limit)),
            usedBytes: parseInt(quota.usage),
            totalBytes: parseInt(quota.limit),
            percentUsed: ((parseInt(quota.usage) / parseInt(quota.limit)) * 100).toFixed(2),
          },
          files: {
            total: files.length,
          },
        },
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get stats',
      });
    }
  }
}

module.exports = new FileController();
