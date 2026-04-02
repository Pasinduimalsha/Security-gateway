/**
 * MLS Engine (Multi-Level Security)
 * Implements Bell-LaPadula Lattice logic for the SDK.
 */

const LATTICE = {
    'U': 10, // Unclassified
    'C': 20, // Confidential
    'S': 30, // Secret
    'TS': 40 // Top Secret
};

function createMLSMiddleware(routeRequiredClearance) {
    const routeLevel = LATTICE[routeRequiredClearance?.toUpperCase()];

    if (!routeLevel) {
        throw new Error(`[MLS Engine] Fatal: Invalid clearance level provided: ${routeRequiredClearance}. Must be U, C, S, or TS.`);
    }

    return (req, res, next) => {
        // verifyToken MUST run before this middleware so req.user exists
        if (!req.user || !req.user.clearance) {
            console.error('[MLS Engine] Missing clearance from JWT Payload!');
            return res.status(403).json({ error: 'MLS Blocked: User clearance level is not defined.' });
        }

        const userLevel = LATTICE[req.user.clearance.toUpperCase()];
        if (!userLevel) {
            return res.status(403).json({ error: `MLS Blocked: Unknown user clearance header '${req.user.clearance}'` });
        }

        const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
        const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

        // ----------------------------------------------------
        // Rule 1: Simple Security Property (No-Read-Up)
        // ----------------------------------------------------
        // Users cannot read data at a classification level higher than their own.
        if (isRead) {
            if (userLevel < routeLevel) {
                console.warn(`[MLS] BLocked READ-UP Attack: User(${req.user.clearance}) trying to read Route(${routeRequiredClearance})`);
                return res.status(403).json({ 
                    error: `Bell-LaPadula Violation: Operation denied. Your clearance (${req.user.clearance}) is too low to read this resource (${routeRequiredClearance}).` 
                });
            }
        }

        // ----------------------------------------------------
        // Rule 2: *-Property (No-Write-Down)
        // ----------------------------------------------------
        // Users at a high classification cannot accidentally or maliciously write high-level data to a low-level target.
        if (isWrite) {
            if (userLevel > routeLevel) {
                console.warn(`[MLS] Blocked WRITE-DOWN Attack: User(${req.user.clearance}) trying to write to Route(${routeRequiredClearance})`);
                return res.status(403).json({ 
                    error: `Bell-LaPadula Violation: Data spillage risk denied. You cannot write sensitive data (${req.user.clearance}) to a lower clearance partition (${routeRequiredClearance}).` 
                });
            }
        }

        // Passed lattice checks!
        console.log(`[MLS Engine] Passed Bell-LaPadula checks for user ${req.user.sub}`);
        next();
    };
}

module.exports = {
    createMLSMiddleware
};
