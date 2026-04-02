# Security Gateway SDK - Proxy Library

This package is a drop-in API Gateway library designed to secure and route traffic to a microservice ecosystem containing Auth, Enclave, and Audit endpoints. 

It acts exclusively as an Express Middleware router.

## How to use this Library

As a third-party developer (Client), you will include this library inside your own backend express server to instantly spin up the Security Gateway shield over your logic.

### 1. Installation
Ensure you have the gateway folder available in your workspace (or published via NPM if deployed).

### 2. Integration Example (Your main app)
```javascript
const express = require('express');
const { SecurityGateway } = require('security-gateway-sdk/proxy');

const app = express();

// Mount the Security Gateway to any route string (e.g. /api)
app.use('/api', SecurityGateway({
    jwtSecret: 'process.env.MY_SECRET', // Required: For verifying tokens
    authTarget: 'http://localhost:7001', // Your custom configured Auth backend
    enclaveTarget: 'http://localhost:4000', // Your Enclave
    auditTarget: 'http://localhost:5000' 
}));

app.listen(3000, () => {
    console.log('Main Application running on port 3000');
});
```

### Routing Rules Under the Hood
Once mounted (for example at `/api`), the library automatically protects traffic:
* `POST /api/auth/register` -> Publicly proxies to `authTarget`
* `GET /api/enclave/data` -> Instantly intercepted! Extracts JWT, validates against `jwtSecret`, and passes to `enclaveTarget` only if valid.

---

## Testing (cURL Examples)

Since we mounted the `SecurityGateway` directly into the Auth service, the Gateway is currently running actively on `http://localhost:7001/api`. You can use these commands to test the integration:

### 1. Register a new user (Public Route)
```bash
curl -X POST http://localhost:7001/api/auth/register \
-H "Content-Type: application/json" \
-d '{"username": "test_user", "password": "password123", "role": "admin"}'
```

### 2. Login to get a JWT Token (Public Route)
```bash
curl -X POST http://localhost:7001/api/auth/login \
-H "Content-Type: application/json" \
-d '{"username": "test_user", "password": "password123"}'
```

### 3. Access the Enclave (Protected Route - Success)
Replace `<YOUR_TOKEN>` with the token string received from the login command.
```bash
curl -X GET http://localhost:7001/api/enclave \
-H "Authorization: Bearer <YOUR_TOKEN>"
```

### 4. Access the Enclave (Protected Route - Failure)
If you try to access the enclave without attaching the token header, the SDK will proactively block you.
```bash
curl -X GET http://localhost:7001/api/enclave
```
