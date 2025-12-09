const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  // Public routes (file serving)
  const publicPaths = ['/cdn/', '/file/'];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key is required',
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  next();
};

module.exports = { authenticate };
