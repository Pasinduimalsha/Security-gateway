const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'user', 'guest'], 
        default: 'user' 
    },
    clearanceLevel: { 
        type: String, 
        default: 'U' 
    }
});

module.exports = mongoose.model('user', UserSchema);
