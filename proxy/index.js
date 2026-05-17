const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createSecurityMiddleware } = require('./middleware/security');
const { createMLSMiddleware } = require('./middleware/mls');
const { createRBACMiddleware } = require('./middleware/rbac');
const { createGlobalRateLimit, createAuthRateLimit, createSensitiveRateLimit } = require('./middleware/rateLimit');

/**
 * Universal Security Gateway Library (Publishable SDK)
 */
function SecurityGateway(options) {
    const router = express.Router();

    if (!options || !options.jwtSecret) {
        throw new Error('[SecurityGateway] Fatal: "jwtSecret" must be provided in configuration options.');
    }

    // --- Availability: Rate Limiting & DDoS Protection ---
    const globalLimiter = createGlobalRateLimit(options.rateLimit?.global);
    const authLimiter = createAuthRateLimit(options.rateLimit?.auth);
    const sensitiveLimiter = createSensitiveRateLimit(options.rateLimit?.sensitive);

    // Apply global rate limit to ALL requests through the gateway
    router.use(globalLimiter);
    console.log('[SecurityGateway] DDoS Protection: Global rate limiter active');

    const verifyToken = createSecurityMiddleware(options.jwtSecret);
    const rbacMiddleware = createRBACMiddleware(options.rbacPolicies);
    const enclaveClients = new Map(); // Cache to maintain persistent secure sessions
    const blsAuditInstances = new Map(); // Cache to maintain aggregate signatures per route

    if (options.routes && Array.isArray(options.routes)) {
        options.routes.forEach(route => {
            const middlewares = [];

            if (route.protected) {
                // Stricter rate limit on sensitive/protected endpoints
                middlewares.push(sensitiveLimiter);
                middlewares.push(verifyToken);
                middlewares.push(rbacMiddleware);
                if (route.requiredClearance) {
                    middlewares.push(createMLSMiddleware(route.requiredClearance, options.mlsLattice));
                }
            }

            if (route.useSecureChannel) {
                const EnclaveClient = require('./lib/enclave-client');
                const BLSAuditSim = require('./lib/bls');
                
                // Get or Create a persistent client for this specific target
                if (!enclaveClients.has(route.target)) {
                    enclaveClients.set(route.target, new EnclaveClient(route.target, route.mrenclave));
                }
                const enclaveClient = enclaveClients.get(route.target);

                // Get or Create a persistent BLS instance to maintain aggregate signatures
                if (!blsAuditInstances.has(route.path)) {
                    blsAuditInstances.set(route.path, new BLSAuditSim(route.blsPrivateKey));
                }
                const blsAudit = blsAuditInstances.get(route.path);

                middlewares.push(express.json());
                middlewares.push(async (req, res) => {
                    try {
                        const payload = req.body && Object.keys(req.body).length > 0 ? req.body : { action: "read_data" };
                        const token = req.headers['authorization']?.split(' ')[1];

                        const result = await enclaveClient.execute(payload, token);

                        const logEntry = {
                            timestamp: new Date().toISOString(),
                            user: req.user?.username || req.user?.sub || 'anonymous',
                            clearance: req.user?.clearance || 'N/A',
                            action: route.actionName || 'gateway_access',
                            resource: route.path,
                            status: 'SUCCESS'
                        };
                        
                        const sigData = blsAudit.signAndAggregate(logEntry);
                        Object.assign(logEntry, sigData);

                        // Audit target is now also route-specific!
                        if (route.auditUrl) {
                            fetch(route.auditUrl + '/log', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(logEntry)
                            }).catch(() => {});
                        }

                        res.json(result);
                    } catch (error) {
                        res.status(500).json({ error: error.message });
                    }
                });
            } else {
                // Auth endpoints get brute-force protection
                middlewares.push(authLimiter);
                const proxyConfig = {
                    target: route.target,
                    changeOrigin: true
                };
                if (route.pathRewrite) proxyConfig.pathRewrite = route.pathRewrite;
                middlewares.push(createProxyMiddleware(proxyConfig));
            }

            router.use(route.path, ...middlewares);
            console.log(`[SecurityGateway] Shield mounted: ${route.path} -> ${route.target}`);
        });
    }

    return router;
}

const { SecureChannel } = require('./lib/crypto');

module.exports = {
    SecurityGateway,
    createSecurityMiddleware,
    createMLSMiddleware,
    SecureChannel,
    createGlobalRateLimit,
    createAuthRateLimit,
    createSensitiveRateLimit
};
