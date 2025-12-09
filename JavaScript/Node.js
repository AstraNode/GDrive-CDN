class CDNClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async upload(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/upload`, {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey },
      body: formData,
    });

    return response.json();
  }

  async delete(fileId) {
    const response = await fetch(`${this.baseUrl}/api/file/${fileId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': this.apiKey },
    });

    return response.json();
  }

  async list(pageSize = 50) {
    const response = await fetch(`${this.baseUrl}/api/files?pageSize=${pageSize}`, {
      headers: { 'x-api-key': this.apiKey },
    });

    return response.json();
  }

  getUrl(fileId) {
    return `${this.baseUrl}/cdn/${fileId}`;
  }
}

// Usage
const cdn = new CDNClient('https://your-cdn.com', 'your-api-key');

// Upload
const result = await cdn.upload(fileBlob);
console.log('CDN URL:', result.data.url);

// Use in HTML
// <img src="https://your-cdn.com/cdn/FILE_ID">
