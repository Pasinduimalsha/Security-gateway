const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

// Role Definitions provided
const roleDefinitions = {
    admin: { resources: ['*'], actions: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], mlsMin: 'TS' },
    user: { resources: ['/data/*', '/reports/*'], actions: ['GET', 'POST'], mlsMin: 'S' },
    guest: { resources: ['/public/*'], actions: ['GET'], mlsMin: 'U' }
};

const register = async (req, res) => {
    try {
        const { username, password, role = 'guest' } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (!roleDefinitions[role]) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Map role to minimum clearance Level based on the configuration logic
        const clearanceLevel = roleDefinitions[role].mlsMin;

        const newUser = new User({
            username,
            password: hashedPassword,
            role,
            clearanceLevel
        });

        await newUser.save();

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                username: newUser.username,
                role: newUser.role,
                clearanceLevel: newUser.clearanceLevel
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Fetch configurations per role logic
        const roleInfo = roleDefinitions[user.role] || roleDefinitions['reader'];

        // Injecting the required resources and actions payload directly into the JWT token!
        // This is extremely helpful for the Gateway/Proxy downstream to validate requests immediately
        const payload = {
            sub: user._id,
            username: user.username,
            role: user.role,
            clearance: user.clearanceLevel,
            resources: roleInfo.resources,
            actions: roleInfo.actions
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        res.json({ token, user: { username: user.username, role: user.role } });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getMe = (req, res) => {
    // authMiddleware already verified the token and appended the decoded payload to req.user
    res.json(req.user);
};

// Tests accessibility of the Enclave service from the Client Backend directly!
const checkEnclaveAccess = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "Missing Bearer token to forward to Enclave" });
    }

    try {
        console.log('[Auth Backend] Calling Enclave directly to test access...');
        const response = await fetch('http://localhost:4000/', {
            method: 'GET',
            headers: {
                'Authorization': token // Pass the token!
            }
        });
        
        let data;
        try {
            data = await response.json();
        } catch(e) {
            data = "Could not parse JSON response";
        }

        return res.status(response.status).json({ 
            success: response.ok, 
            enclave_http_status: response.status, 
            enclave_response: data 
        });

    } catch (error) {
        console.error('[Auth Backend] Failed to reach Enclave:', error);
        return res.status(500).json({ error: "Failed to reach enclave over the network" });
    }
}

// NEW METHOD: Formally verify the Bell-LaPadula clearance!
const simulateMls = async (req, res) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });

    try {
        console.log('[Auth Service / Client] Ping Enclave to test BLP Compliance...');
        // Hitting the targeted enclave directly. Enclave is armed with its own MLS shield from the SDK
        const response = await fetch('http://localhost:4000/', {
            method: 'GET',
            headers: { 'Authorization': token }
        });
        
        const data = await response.json();
        
        const isBellLaPadulaBlocked = response.status === 403;
        
        return res.status(response.status).json({ 
            test_passed: response.ok, 
            status_code: response.status, 
            mls_result: isBellLaPadulaBlocked ? 'BLOCKED BY BELL-LAPADULA!' : 'ACCESS GRANTED',
            details: data 
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
 
module.exports = {
    register, 
    login,
    getMe,
    checkEnclaveAccess,
    simulateMls
};
