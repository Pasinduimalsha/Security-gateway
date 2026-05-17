const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting & DDoS Protection Middleware
 * 
 * Provides the Availability property of the CIA triad by preventing
 * resource exhaustion through excessive requests.
 * 
 * Three tiers of protection:
 * 1. Global rate limit — caps total requests per IP
 * 2. Auth rate limit — stricter limit on login/register (brute-force protection)
 * 3. Sensitive route rate limit — strictest limit on protected endpoints
 */

/**
 * Creates a global rate limiter for all gateway traffic.
 * Default: 100 requests per 15 minutes per IP.
 */
function createGlobalRateLimit(options = {}) {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,   // 15 minutes
        max: options.max || 100,                          // 100 requests per window
        standardHeaders: true,                            // Return rate limit info in headers
        legacyHeaders: false,
        message: {
            error: 'Too many requests from this IP. Please try again later.',
            retryAfterMs: options.windowMs || 15 * 60 * 1000
        },
        handler: (req, res, next, options) => {
            console.warn(`[DDoS Protection] Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json(options.message);
        }
    });
}

/**
 * Creates a strict rate limiter for authentication endpoints.
 * Default: 10 requests per 15 minutes per IP (brute-force protection).
 */
function createAuthRateLimit(options = {}) {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,   // 15 minutes
        max: options.max || 10,                           // 10 login attempts per window
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many authentication attempts. Account protection triggered.',
            retryAfterMs: options.windowMs || 15 * 60 * 1000
        },
        handler: (req, res, next, options) => {
            console.warn(`[DDoS Protection] Auth rate limit exceeded for IP: ${req.ip} on ${req.path}`);
            res.status(429).json(options.message);
        }
    });
}

/**
 * Creates a strict rate limiter for sensitive/protected routes (e.g., Enclave access).
 * Default: 20 requests per 15 minutes per IP.
 */
function createSensitiveRateLimit(options = {}) {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,   // 15 minutes
        max: options.max || 20,                           // 20 requests per window
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many requests to protected resource. Access temporarily restricted.',
            retryAfterMs: options.windowMs || 15 * 60 * 1000
        },
        handler: (req, res, next, options) => {
            console.warn(`[DDoS Protection] Sensitive route rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json(options.message);
        }
    });
}

module.exports = {
    createGlobalRateLimit,
    createAuthRateLimit,
    createSensitiveRateLimit
};
