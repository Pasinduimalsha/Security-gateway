/**
 * RBAC Engine (Role-Based Access Control)
 * Enforces policies provided at initialization.
 */

function createRBACMiddleware(policies) {
    if (!policies) {
        console.warn('[RBAC Engine] Warning: No policies provided. All access will be denied.');
    }

    return (req, res, next) => {
        // verifyToken MUST run before this middleware so req.user exists
        if (!req.user || !req.user.role) {
            console.error('[RBAC Engine] Missing role from JWT Payload!');
            return res.status(403).json({ error: 'RBAC Blocked: User role is not defined.' });
        }

        const userRole = req.user.role.toLowerCase();
        const policy = policies ? policies[userRole] : null;

        if (!policy) {
            return res.status(403).json({ error: `RBAC Blocked: No policy defined for role '${userRole}'` });
        }

        const { resources, actions } = policy;
        const requestPath = req.path;
        const requestMethod = req.method.toUpperCase();

        // 1. Check Action Permission
        if (!actions.includes('*') && !actions.includes(requestMethod)) {
            console.warn(`[RBAC] Blocked Action: Role(${userRole}) cannot perform ${requestMethod}`);
            return res.status(403).json({ error: `RBAC Violation: Your role (${userRole}) is not permitted to perform ${requestMethod} operations.` });
        }

        // 2. Check Resource Permission (Simple glob-like matching)
        const hasAccess = resources.some(pattern => {
            if (pattern === '*') return true;
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regex.test(requestPath);
        });

        if (!hasAccess) {
            console.warn(`[RBAC] Blocked Resource: Role(${userRole}) cannot access ${requestPath}`);
            return res.status(403).json({ error: `RBAC Violation: Your role (${userRole}) does not have access to the resource ${requestPath}.` });
        }

        console.log(`[RBAC Engine] Passed policy checks for user ${req.user.sub} (Role: ${userRole})`);
        next();
    };
}

module.exports = {
    createRBACMiddleware
};
