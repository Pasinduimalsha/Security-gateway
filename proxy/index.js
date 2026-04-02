const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createSecurityMiddleware } = require('./middleware/security');

/**
 * Universal Security Gateway Library (Publishable SDK)
 * Dynamic configuration for securing any microservice architecture.
 *
 * @param {Object} options Configuration Object
 * @param {string} options.jwtSecret The verification secret for Tokens
 * @param {Array} options.routes Array defining paths, targets, and protection logic
 */
function SecurityGateway(options) {
    const router = express.Router();

    if (!options || !options.jwtSecret) {
        throw new Error('[SecurityGateway] Fatal: "jwtSecret" must be provided in configuration options.');
    }

    const verifyToken = createSecurityMiddleware(options.jwtSecret);

    if (options.routes && Array.isArray(options.routes)) {
        options.routes.forEach(route => {
            const proxyConfig = {
                target: route.target,
                changeOrigin: true
            };

            // Custom rewrite rules provided by the implementing developer
            if (route.pathRewrite) {
                proxyConfig.pathRewrite = route.pathRewrite;
            }

            // Chain middlewares dynamically depending on if route is protected
            const middlewares = [];
            if (route.protected) {
                middlewares.push(verifyToken);
            }
            middlewares.push(createProxyMiddleware(proxyConfig));

            router.use(route.path, ...middlewares);
            
            console.log(`[SecurityGateway] Shield mounted: ${route.path} -> ${route.target} (Protected: ${!!route.protected})`);
        });
    }

    return router;
}

module.exports = {
    SecurityGateway,
    createSecurityMiddleware // Exported so clients like Enclave can secure their own direct networks!
};
