# Secure Gateway SDK - Proxy Library

This package is a modular API Gateway router library designed to secure and route traffic to a microservice ecosystem (Auth, Enclave, and Audit endpoints).

## 1. Installation

Install the package via the npm registry:

```bash
npm install secure-gateway-sdk
```

---

## 2. Setup Requirements

To use this library, your Node.js/Express application must have:
* **Express** installed as a peer dependency.
* **JSON Parsing Middleware** (`express.json()`) mounted before the gateway.
* An active **JWT Token Secret** to decode and verify client identities.

---

## 3. Integration Code Example

Create your gateway server (e.g., `gateway.js`) and mount the middleware as follows:

```javascript
const express = require('express');
const { SecurityGateway } = require('secure-gateway-sdk');

const app = express();

// Required to parse JSON payloads for secure TEE channels
app.use(express.json());

// Initialize and mount the gateway router
app.use('/api', SecurityGateway({
    jwtSecret: process.env.JWT_SECRET || 'your_secret_signing_key',
    routes: [
        {
            path: '/auth',
            target: 'http://<auth-service-host>:<port>',
            protected: false
        },
        {
            path: '/enclave',
            target: 'http://<enclave-service-host>:<port>',
            protected: true,
            requiredClearance: 'TS',
            useSecureChannel: true,
            mrenclave: 'YOUR_EXPECTED_MRENCLAVE_HASH',
            blsPrivateKey: process.env.BLS_PRIVATE_KEY || 'your_bls_private_key',
            auditUrl: 'http://<audit-service-host>:<port>',
            actionName: 'SECURE_COMPUTE'
        }
    ],
    rbacPolicies: {
        admin: { resources: ['*'], actions: ['*'] },
        user: { resources: ['/enclave'], actions: ['GET'] }
    },
    mlsLattice: {
        'U': 10,
        'S': 30,
        'TS': 40
    }
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Security Gateway active on port ${PORT}`);
});
```

---

## 4. Configuration Reference

### SecurityGateway Options

| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `jwtSecret` | String | Yes | Secret key used to verify client JWT signatures. |
| `routes` | Array | Yes | List of route definitions to protect and proxy. |
| `rbacPolicies` | Object | No | Map of roles to allowed resources and request methods. |
| `mlsLattice` | Object | No | Clearance level hierarchy definitions (e.g., `U`, `S`, `TS`). |
| `rateLimit` | Object | No | Custom intervals and maximum requests for the rate limiters. |

### Route Object Schema

| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `path` | String | Yes | Route mount path (e.g., `/enclave`). |
| `target` | String | Yes | Microservice downstream target URL. |
| `protected` | Boolean | Yes | Whether requests require JWT authentication and RBAC validation. |
| `requiredClearance`| String | No | Level needed to pass Bell-LaPadula clearance validation. |
| `useSecureChannel` | Boolean | No | Toggles automated TEE Handshake (ECDH key exchange). |
| `mrenclave` | String | No | Expected hardware enclave hash identity. |
| `blsPrivateKey` | String | No | Private key used to sign transaction aggregate proofs. |
| `auditUrl` | String | No | Endpoint of the centralized Cryptographic Audit Log Service. |
| `actionName` | String | No | Identifier label for the audited action type. |
