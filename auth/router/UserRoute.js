const express = require('express');
const router = express.Router();
const UserController = require('../controller/UserController');
const { authMiddleware } = require('../middleware/AuthMiddleware');

// Register a new user
router.post('/register', UserController.register);

// Login a user
router.post('/login', UserController.login);

// Get current user details from Token
router.get('/me', authMiddleware, UserController.getMe);

module.exports = router;