# Security Gateway SDK 🛡️

A secure communication middleware between two untrusted parties over a network, implementing the full **CIA Triad**, **Authentication**, and **Non-Repudiation** using cryptographic protocols.

> **Course Project** — IS4010: Information Security  
> **Evaluation Week**: May 18, 2026

---

## 🌟 Security Properties Achieved

| Property | Mechanism | Status |
|:---------|:----------|:-------|
| **Confidentiality** | ECDH Key Exchange + AES-256-GCM Encryption | ✅ |
| **Integrity** | AES-GCM Authentication Tags | ✅ |
| **Availability** | Three-tier Rate Limiting & DDoS Protection | ✅ |
| **Authentication** | JWT Tokens + Enclave Attestation (mrenclave) | ✅ |
| **Non-Repudiation** | BLS12-381 Aggregate Signatures on Audit Logs | ✅ |
| **Authorization** | Bell-LaPadula MLS (No-Read-Up, No-Write-Down) + RBAC | ✅ |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Security Gateway (Proxy :<PROXY_PORT>)       │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   JWT     │→ │   RBAC   │→ │Bell-     │→ │ ECDH + AES-   │  │
│  │  Verify   │  │  Engine  │  │LaPadula  │  │ 256-GCM       │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────┬───────┘  │
│       ↑              ↑             ↑                │          │
│  Rate Limiter   Rate Limiter  Rate Limiter          │          │
│  (Global)       (Auth)        (Sensitive)           │          │
└─────────────────────────────────────────────────────┼──────────┘
                                                      │
              ┌───────────────────────────────────────┼──────┐
              │                                       ▼      │
   ┌──────────┴──┐    ┌──────────────┐    ┌─────────────────┐│
   │ Auth :<AUTH_PORT> │    │ Enclave :<ENCLAVE_PORT> │    │ Audit :<AUDIT_PORT> ││
   │ (MongoDB)   │    │ (TEE Sim)    │    │  (BLS Verify)   ││
   └─────────────┘    └──────────────┘    └─────────────────┘│
              │           Dashboard :<DASHBOARD_PORT> (React Monitor) │
              └───────────────────────────────────────────────┘
```

The project uses an **npm workspace monorepo** with 5 microservices:

| Service | Port | Purpose |
|:--------|:-----|:--------|
| **Proxy** | `<PROXY_PORT>` | Core Security Gateway — routes all traffic through security middleware |
| **Enclave** | `<ENCLAVE_PORT>` | Simulated Trusted Execution Environment (Intel SGX / ARM CCA) |
| **Audit** | `<AUDIT_PORT>` | Immutable audit log with BLS aggregate signature verification |
| **Dashboard** | `<DASHBOARD_PORT>` | React monitoring UI with attack simulation capabilities |
| **Auth** | `<AUTH_PORT>` | User registration, login, JWT issuance (MongoDB) |
| **Swagger Docs** | `<DOCS_PORT>` | Interactive API documentation |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** running locally on port `<MONGO_PORT>`

### Step 1: Clone the Repository

```bash
git clone https://github.com/Pasinduimalsha/Security-gateway.git
cd Security-gateway
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Or create it manually with these values:

```env
# JWT Configuration
JWT_SECRET=<YOUR_JWT_SECRET>
JWT_EXPIRES=1h

# Port Configurations
AUTH_PORT=<AUTH_PORT>
PROXY_PORT=<PROXY_PORT>
ENCLAVE_PORT=<ENCLAVE_PORT>
AUDIT_PORT=<AUDIT_PORT>

# Database
MONGO_URI=mongodb://localhost:<MONGO_PORT>/<DB_NAME>

# Development Flags
NODE_ENV=development
USE_LOCAL_SDK=true

# Security Parameters
ENCLAVE_MRENCLAVE=<ENCLAVE_MRENCLAVE_HASH>
BLS_PRIVATE_KEY=<BLS_PRIVATE_KEY>
ENCLAVE_CLASSIFICATION=TS
```

### Step 4: Start MongoDB

**Option A** — If MongoDB is installed locally:
```bash
mongod
```

**Option B** — Using Docker:
```bash
docker-compose up -d
```

### Step 5: Run the Project

Launch all 6 services simultaneously:

```bash
npm run dev
```

You should see color-coded output for each service:

```
[PROXY]     Standalone Gateway running on port <PROXY_PORT>
[ENCLAVE]   Secured Service running on port <ENCLAVE_PORT>
[AUDIT]     Service running on port <AUDIT_PORT>
[AUTH]      Server is running on port <AUTH_PORT>
[DASHBOARD] VITE ready — http://localhost:<DASHBOARD_PORT>/
[DOCS]      Swagger UI — http://localhost:<DOCS_PORT>/api-docs
```

### Step 6: Open the Dashboard

Navigate to **[http://localhost:<DASHBOARD_PORT>](http://localhost:<DASHBOARD_PORT>)** in your browser.

---

## 🎮 Using the Dashboard

The dashboard has **three tabs**:

### Monitor Tab
Real-time view of system health:
- **Audit Proof** — Current BLS aggregate signature hash
- **Integrity** — Chain verification status (PASSED/FAILED)
- **Services** — Online/offline status of all 4 backend services
- **Live Audit Logs** — Table of all gateway events with signature indices

### Attack Simulator Tab
8 pre-built scenarios to demonstrate every security property:

| Category | Scenario | Tests |
|:---------|:---------|:------|
| **Normal** | Admin Access (TS Clearance) | Authentication, Confidentiality, Integrity |
| **Normal** | Standard User Access (S Clearance) | Authentication, Authorization |
| **Attack** | Bell-LaPadula Read-Up Attack | Authorization, Confidentiality |
| **Attack** | JWT Token Forgery | Authentication |
| **Attack** | Missing Authentication | Authentication |
| **Attack** | Expired Token Replay | Authentication |
| **Availability** | DDoS Flood Simulation | Availability |
| **Availability** | Brute Force Login Attack | Availability, Authentication |

### Console Tab
Full terminal output showing step-by-step logs from every scenario execution.

---

## 🔐 Threat Model

| Threat | Mitigation |
|:-------|:-----------|
| **Man-in-the-Middle** | ECDH + AES-256-GCM — attacker sees only ciphertext, cannot decrypt without ephemeral key |
| **Token Forgery** | JWT signature verification — rejects tokens not signed by the Auth service secret |
| **Data Spillage** | Bell-LaPadula No-Write-Down — TS users blocked from writing to U endpoints |
| **Unauthorized Read** | Bell-LaPadula No-Read-Up — low clearance users blocked from high clearance data |
| **Server Spoofing** | Enclave attestation — verifies mrenclave hash + HMAC quote before data exchange |
| **Audit Tampering** | BLS aggregate signatures — deleting any log breaks the chain, detected by `/verify` |
| **DDoS / Flooding** | Three-tier rate limiting — global (100/15min), auth (10/15min), sensitive (20/15min) |
| **Brute Force** | Auth rate limiter — 10 login attempts per 15 minutes per IP |
| **Replay Attack** | JWT expiration (1h) + unique random 12-byte IV per encryption |

---

## 📦 SDK Usage (Standalone)

The gateway can be used as a drop-in middleware in any Express application:

```javascript
const { SecurityGateway } = require('secure-gateway-sdk');

app.use('/api', SecurityGateway({
  jwtSecret: process.env.JWT_SECRET,
  rbacPolicies: {
    admin: { resources: ['*'], actions: ['GET','POST','PUT','DELETE'] },
    guest: { resources: ['/public/*'], actions: ['GET'] }
  },
  mlsLattice: { 'U': 10, 'C': 20, 'S': 30, 'TS': 40 },
  routes: [
    { path: '/public', target: 'http://backend:4000', protected: false },
    { path: '/secure', target: 'http://backend:4000', protected: true, requiredClearance: 'S' }
  ]
}));
```

---

## 🧪 API Quick Test (cURL)

```bash
# 1. Register an admin user
curl -X POST http://localhost:<AUTH_PORT>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"pass123","role":"admin"}'

# 2. Login and get JWT token
curl -X POST http://localhost:<AUTH_PORT>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"pass123"}'

# 3. Access the Enclave (paste your token)
curl -X POST http://localhost:<PROXY_PORT>/api/enclave \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{"action":"SECURE_COMPUTE"}'

# 4. Check audit logs
curl http://localhost:<AUDIT_PORT>/logs

# 5. Verify audit integrity
curl http://localhost:<AUDIT_PORT>/verify
```

---

## 📁 Project Structure

```
Security-gateway/
├── package.json              # NPM workspace root
├── gateway-config.json       # Proxy route definitions
├── docker-compose.yml        # MongoDB container
├── swagger.json              # OpenAPI 3.0 spec
├── .env.example              # Environment template
│
├── proxy/                    # ★ Core Security Gateway SDK
│   ├── index.js              # SecurityGateway() factory
│   ├── server.js             # Standalone Express server
│   ├── middleware/
│   │   ├── security.js       # JWT verification
│   │   ├── mls.js            # Bell-LaPadula enforcement
│   │   ├── rbac.js           # Role-based access control
│   │   └── rateLimit.js      # DDoS & rate limiting
│   └── lib/
│       ├── crypto.js         # ECDH + AES-256-GCM
│       ├── enclave-client.js # TEE attestation + secure execution
│       └── bls.js            # BLS aggregate signatures
│
├── auth/                     # Authentication Service
│   ├── controller/UserController.js
│   ├── middleware/AuthMiddleware.js
│   ├── model/User.js
│   └── router/UserRoute.js
│
├── enclave/                  # Simulated TEE Service
│   └── index.js
│
├── audit/                    # Immutable Audit Service
│   └── index.js
│
├── dashboard/                # React Monitoring UI
│   └── src/App.jsx
│
└── config/                   # Shared Configuration
    ├── index.js
    └── sdk-resolver.js
```

---

## 📄 License

MIT