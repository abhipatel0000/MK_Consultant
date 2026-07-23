const rateLimit = require('express-rate-limit');
const response = require('../utils/response');

// 1. General API Rate Limiting
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    return response.error(res, 'Too many requests from this IP. Please try again after 15 minutes.', 429);
  }
});

// 2. Login Brute-force Protection
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return response.error(res, 'Too many login attempts. Please try again after 15 minutes.', 429);
  }
});

// 3. Enquiry / Lead Spam Protection
exports.enquiryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 enquiry submissions per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return response.error(res, 'Too many enquiry submissions. Please wait an hour before submitting again.', 429);
  }
});
