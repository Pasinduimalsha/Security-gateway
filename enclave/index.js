const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });
const { createSecurityMiddleware } = require('../proxy/middleware/security');
const { createMLSMiddleware } = require('../proxy/middleware/mls'); // Extract directly from library!

const app = express();
app.use(cors());

// Require valid cryptographically signed JWT to access Enclave directly
const verifyToken = createSecurityMiddleware(process.env.JWT_SECRET || 'fallback_secret');
app.use(verifyToken);

// Mount Bell-LaPadula Shield locally: Enclave requires Secret 'S' clearance to read!
const mlsShield = createMLSMiddleware('S'); 
app.use(mlsShield);

app.get('/', (req, res) => {
    console.log(`[Enclave] Direct or Proxied request authorized for User ${req.user.sub}`);

    res.json({
        message: 'Successfully reached the Protected Enclave Service! 🔒',
        authorized_user: req.user.sub,
        role: req.user.role
    });
});

app.listen(4000, () => {
    console.log(`[Enclave] Secured Service running on port 4000`);
});
