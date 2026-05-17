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

const isDev = process.env.NODE_ENV === 'development';

/**
 * Creates a global rate limiter for all gateway traffic.
 * Default: 100 requests per 15 minutes per IP.
 * In development, window is 15 seconds to allow fast simulator resets.
 */
function createGlobalRateLimit(options = {}) {
    const windowMs = process.env.RATE_LIMIT_GLOBAL_WINDOW_MS 
        ? parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) 
        : (options.windowMs || (isDev ? 15 * 1000 : 15 * 60 * 1000));
    const max = process.env.RATE_LIMIT_GLOBAL_MAX 
        ? parseInt(process.env.RATE_LIMIT_GLOBAL_MAX) 
        : (options.max || 100);

    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,                            // Return rate limit info in headers
        legacyHeaders: false,
        message: {
            error: 'Too many requests from this IP. Please try again later.',
            retryAfterMs: windowMs
        },
        handler: (req, res, next, options) => {
            console.warn(`[DDoS Protection] Global rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json(options.message);
        }
    });
}

/**
 * Creates a strict rate limiter for authentication endpoints.
 * Default: 10 requests per 15 minutes per IP (brute-force protection).
 * In development, window is 15 seconds to allow fast simulator resets.
 */
function createAuthRateLimit(options = {}) {
    const windowMs = process.env.RATE_LIMIT_AUTH_WINDOW_MS 
        ? parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) 
        : (options.windowMs || (isDev ? 15 * 1000 : 15 * 60 * 1000));
    const max = process.env.RATE_LIMIT_AUTH_MAX 
        ? parseInt(process.env.RATE_LIMIT_AUTH_MAX) 
        : (options.max || 10);

    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many authentication attempts. Account protection triggered.',
            retryAfterMs: windowMs
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
 * In development, window is 15 seconds and max is 10 to guarantee simulator triggers and resets.
 */
function createSensitiveRateLimit(options = {}) {
    const windowMs = process.env.RATE_LIMIT_SENSITIVE_WINDOW_MS 
        ? parseInt(process.env.RATE_LIMIT_SENSITIVE_WINDOW_MS) 
        : (options.windowMs || (isDev ? 15 * 1000 : 15 * 60 * 1000));
    const max = process.env.RATE_LIMIT_SENSITIVE_MAX 
        ? parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX) 
        : (options.max || (isDev ? 10 : 20));

    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            error: 'Too many requests to protected resource. Access temporarily restricted.',
            retryAfterMs: windowMs
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
