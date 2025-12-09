const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_DURATION) || 3600,
  checkperiod: 600,
  maxKeys: 1000,
});

const cacheMiddleware = (duration = null) => {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      // Set cache headers
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${duration || process.env.CACHE_DURATION || 3600}`);
      
      if (cachedResponse.contentType) {
        res.set('Content-Type', cachedResponse.contentType);
        return res.send(cachedResponse.data);
      }
      return res.json(cachedResponse);
    }

    res.set('X-Cache', 'MISS');
    res.originalJson = res.json;
    res.originalSend = res.send;

    res.json = (body) => {
      cache.set(key, body, duration);
      res.originalJson(body);
    };

    res.sendCached = (data, contentType) => {
      cache.set(key, { data, contentType }, duration);
      res.set('Content-Type', contentType);
      res.originalSend(data);
    };

    next();
  };
};

const clearCache = (pattern = null) => {
  if (pattern) {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.del(key);
      }
    });
  } else {
    cache.flushAll();
  }
};

module.exports = { cacheMiddleware, clearCache, cache };
