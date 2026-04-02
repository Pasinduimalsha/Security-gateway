const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '1h';

// Role Definitions provided
const roleDefinitions = {
    admin: { resources: ['*'], actions: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], mlsMin: 'U' },
    analyst: { resources: ['/data/*', '/reports/*'], actions: ['GET', 'POST'], mlsMin: 'C' },
    reader: { resources: ['/data/*', '/reports/*', '/public/*'], actions: ['GET'], mlsMin: 'U' },
    operator: { resources: ['/exec/*', '/jobs/*'], actions: ['GET', 'POST'], mlsMin: 'S' }
};

const register = async (req, res) => {
    try {
        const { username, password, role = 'reader' } = req.body;

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
 
module.exports = {
    register, 
    login,
    getMe
};
