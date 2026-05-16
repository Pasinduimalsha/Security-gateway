const express = require('express');
const bodyParse = require('body-parser');
const cors = require('cors');
require('dotenv').config({ path: '../.env' }); // Using workspace .env
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(bodyParse.urlencoded({ extended: true }));
app.use(bodyParse.json());

const UserRoute = require('./router/UserRoute');
const { SecurityGateway } = require('../config/sdk-resolver');

// Database connection
const PORT = process.env.AUTH_PORT || 7000;
// We added a local MONGO_URI to the .env, falling back if not present
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/security-gateway';

// Try to connect to MongoDB, but start the server regardless so lightweight
// endpoints (like /test) remain available while DB is down.
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });

app.listen(PORT, () => {
  console.log(`[Auth] Server is running on port ${PORT}`);
});

// Sample route
app.get('/test', (req, res) => {
  return res.send({ 'message': 'API is working' });
});

app.use('/api/v1/users', UserRoute);

const config = require('../config');

app.use('/api', SecurityGateway({
  jwtSecret: process.env.JWT_SECRET,
  auditTarget: `http://localhost:${process.env.AUDIT_PORT || 5000}`,
  rbacPolicies: config.rbac.policies,
  mlsLattice: config.mls.lattice,
  enclave: { mrenclave: config.enclave.mrenclave },
  bls: { privateKey: config.bls.privateKey },
  routes: [
    { path: '/auth', target: `http://localhost:${PORT}/api/v1/users`, protected: false },
    { path: '/enclave', target: `http://localhost:${process.env.ENCLAVE_PORT || 4000}`, protected: true, requiredClearance: 'S', useSecureChannel: true }
  ]
}));
