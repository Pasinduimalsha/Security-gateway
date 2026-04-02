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
  return res.send({'message': 'API is working'});
});

app.use('/api/v1', UserRoute);
