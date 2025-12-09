const { drive } = require('../config/google');
const { Readable } = require('stream');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

class DriveService {
  constructor() {
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(file, customName = null) {
    const fileId = uuidv4();
    const extension = file.originalname.split('.').pop();
    const fileName = customName || `${fileId}.${extension}`;

    const fileMetadata = {
      name: fileName,
      parents: [this.folderId],
    };

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    const media = {
      mimeType: file.mimetype,
      body: bufferStream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, mimeType, size, webContentLink, createdTime',
    });

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return {
      id: response.data.id,
      name: response.data.name,
      mimeType: response.data.mimeType,
      size: response.data.size,
      createdAt: response.data.createdTime,
    };
  }

  /**
   * Get file metadata
   */
  async getFileInfo(fileId) {
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime',
    });
    return response.data;
  }

  /**
   * Get file content as stream
   */
  async getFileStream(fileId) {
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return response.data;
  }

  /**
   * Get file content as buffer
   */
  async getFileBuffer(fileId) {
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(response.data);
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId) {
    await drive.files.delete({ fileId: fileId });
    return { success: true };
  }

  /**
   * List all files in the CDN folder
   */
  async listFiles(pageSize = 100, pageToken = null) {
    const response = await drive.files.list({
      q: `'${this.folderId}' in parents and trashed = false`,
      pageSize: pageSize,
      pageToken: pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime)',
      orderBy: 'createdTime desc',
    });

    return {
      files: response.data.files,
      nextPageToken: response.data.nextPageToken,
    };
  }

  /**
   * Search files by name
   */
  async searchFiles(query) {
    const response = await drive.files.list({
      q: `'${this.folderId}' in parents and name contains '${query}' and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime)',
    });
    return response.data.files;
  }

  /**
   * Get storage usage stats
   */
  async getStorageStats() {
    const response = await drive.about.get({
      fields: 'storageQuota',
    });
    return response.data.storageQuota;
  }
}

module.exports = new DriveService();
