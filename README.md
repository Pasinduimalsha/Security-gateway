# Security Gateway SDK 🛡️

A professional, project-agnostic Security Gateway middleware designed for microservices. It implements Multi-Level Security (MLS), Role-Based Access Control (RBAC), and cryptographically secure communication channels.

## 🌟 Key Features

- **MLS Engine**: Lattice-based Bell-LaPadula security model (No-Read-Up, No-Write-Down).
- **RBAC Engine**: Dynamic, policy-driven role-based access control.
- **Secure Channel**: ECDH key exchange with AES-256-GCM authenticated encryption.
- **Non-Repudiation**: BLS12-381 Aggregate Signatures for immutable audit trails.
- **TEE Simulation**: Simulated Trusted Execution Environment (Intel SGX / ARM CCA).
- **Monitoring Dashboard**: Real-time React dashboard for log tracking and security verification.

## 🏗️ Architecture

The project is structured as an NPM workspace monorepo:

- `/proxy`: The core Security Gateway SDK (Project-agnostic).
- `/auth`: Authentication service with JWT and User management.
- `/enclave`: Simulated TEE backend for secure processing.
- `/audit`: Immutable audit logging service.
- `/dashboard`: React/Vite monitoring UI.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Optional, for Auth service)

### 2. Installation
Install all dependencies for the monorepo:
```bash
npm install
```

### 3. Configuration
Create a `.env` file in the root (see `.env.example`):
```bash
cp .env.example .env
```

### 4. Running the Project
Launch all microservices and the dashboard simultaneously:
```bash
npm run dev
```

- **Gateway**: [http://localhost:3000](http://localhost:3000)
- **Dashboard**: [http://localhost:6001](http://localhost:6001)
- **API Docs**: [http://localhost:8000/api-docs](http://localhost:8000/api-docs)

## 🛡️ Security Properties

| Property | Mechanism |
| :--- | :--- |
| **Confidentiality** | ECDH Key Exchange + AES-256-GCM |
| **Integrity** | AES-GCM Authentication Tags |
| **Authentication** | JSON Web Tokens (JWT) |
| **Authorization** | MLS (Bell-LaPadula) + RBAC |
| **Non-Repudiation** | BLS Aggregate Signatures |

## 📦 SDK Usage (Standalone)

The Gateway can be used as a standalone middleware in any Express app:

```javascript
const { SecurityGateway } = require('./proxy');

app.use('/api', SecurityGateway({
  jwtSecret: process.env.JWT_SECRET,
  rbacPolicies: myPolicies,
  mlsLattice: myLattice,
  routes: [
    { 
      path: '/secure-data', 
      target: 'http://backend:4000', 
      protected: true, 
      requiredClearance: 'S' 
    }
  ]
}));
```

## 📄 License
MIT