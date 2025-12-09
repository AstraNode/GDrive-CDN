const rateLimit = require('express-rate-limit');

const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: (options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
    max: options.max || parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: {
      success: false,
      error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different limiters for different endpoints
const uploadLimiter = createRateLimiter({ windowMs: 15, max: 20 });
const downloadLimiter = createRateLimiter({ windowMs: 1, max: 200 });
const apiLimiter = createRateLimiter({ windowMs: 15, max: 100 });

module.exports = { createRateLimiter, uploadLimiter, downloadLimiter, apiLimiter };
