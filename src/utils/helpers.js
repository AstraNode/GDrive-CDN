const mime = require('mime-types');

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
  code: ['text/html', 'text/css', 'application/javascript', 'application/json'],
};

const ALL_ALLOWED_TYPES = Object.values(ALLOWED_TYPES).flat();

const validateFileType = (mimetype, allowedCategories = null) => {
  if (allowedCategories) {
    const allowedTypes = allowedCategories.flatMap(cat => ALLOWED_TYPES[cat] || []);
    return allowedTypes.includes(mimetype);
  }
  return ALL_ALLOWED_TYPES.includes(mimetype);
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileCategory = (mimetype) => {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(mimetype)) return category;
  }
  return 'other';
};

const generateCdnUrl = (req, fileId, fileName = null) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  if (fileName) {
    return `${baseUrl}/cdn/${fileId}/${fileName}`;
  }
  return `${baseUrl}/cdn/${fileId}`;
};

module.exports = {
  validateFileType,
  formatFileSize,
  getFileCategory,
  generateCdnUrl,
  ALLOWED_TYPES,
  ALL_ALLOWED_TYPES,
};
