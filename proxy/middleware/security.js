const jwt = require('jsonwebtoken');

/**
 * Creates the security verification middleware using an injected secret.
 * @param {string} secret The secret key used to verify the JWT signature.
 */
const createSecurityMiddleware = (secret) => {
    if (!secret) {
        throw new Error('[SecurityGateway] A JWT secret is required to initialize security middleware.');
    }

    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn('[SecurityGateway] Blocked request: Missing or invalid Authorization header');
            return res.status(401).json({ error: 'Unauthorized: Missing token' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, secret);
            
            // Attach the fully decoded token metadata to the request
            req.user = decoded;
            
            // Inject into headers so downstream client microservices know who the user is
            req.headers['x-user-id'] = decoded.sub;
            req.headers['x-user-role'] = decoded.role;
            req.headers['x-user-clearance'] = decoded.clearance;
            
            console.log(`[SecurityGateway] Authorized request for user ${decoded.username} (${decoded.role})`);
            next();
        } catch (error) {
            console.warn(`[SecurityGateway] Blocked request: Invalid token - ${error.message}`);
            return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
        }
    };
};

module.exports = {
    createSecurityMiddleware
};
