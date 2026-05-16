# SECURITY GATEWAY SDK
## Step-by-Step Implementation Guide & Status

**MLS (Bell-LaPadula) · RBAC (OPA) · TEE (Intel SGX / ARM CCA) · BLS Aggregate Signatures**

### Overview (Course Project Alignment)
This project is designed as a secure communication scheme between two untrusted parties over a network:
- **Party A (Client):** The Auth Service acting on behalf of the user.
- **Party B (Backend):** The Secure Enclave Service.
The **Security Proxy** acts as the middleware brokering and enforcing security properties (CIA Triad + Non-repudiation) across this channel.

- **Port 3000**: Security Proxy
- **Port 4000**: Enclave Service
- **Port 5000**: Audit Service
- **Port 6000**: Dashboard
- **Port 7000/7001**: Auth Service

### Table of Contents
* [Course Project Design & Threat Model](#course-project-design--threat-model)
1. [Prerequisites & Environment Setup](#step-1-prerequisites--environment-setup)
2. [Project Structure & Configuration](#step-2-project-structure--configuration)
3. [Auth Module — JWT Login & Verify](#step-3-auth-module--jwt-login--verify)
4. [MLS Engine — Bell-LaPadula Policy](#step-4-mls-engine--bell-lapadula-policy)
5. [RBAC Engine — OPA Policy Evaluation](#step-5-rbac-engine--opa-policy-evaluation)
6. [Crypto Module — AES-256-GCM](#step-6-crypto-module--aes-256-gcm)
7. [Enclave Service — TEE Simulation](#step-7-enclave-service--tee-simulation)
8. [BLS Audit Logger — Aggregate Sigs](#step-8-bls-audit-logger--aggregate-sigs)
9. [Audit Service — Immutable Log](#step-9-audit-service--immutable-log)
10. [Dashboard — React Monitoring UI](#step-10-dashboard--react-monitoring-ui)
11. [Integration Testing](#step-11-integration-testing)

---

## Course Project Design & Threat Model

### 1. Defining the "Two Untrusted Parties"
Since the Security Proxy acts as a security middleware, we will define the two untrusted communicating parties as:
*   **Party A: The Auth Service** (Acting as the client on behalf of the user. It generates the JWT and actively makes network requests to the Enclave via endpoints like `/test-enclave` and `/test-mls`).
*   **Party B: The Secure Enclave Service** (The backend Trusted Execution Environment holding sensitive data/computations).

**The Role of the Proxy (Middleware):** The network between the Client and the Enclave is completely untrusted. The Proxy sits in the middle as the Enforcement Point. It intercepts the communication, verifies identity (Authentication), enforces military-grade access rules (MLS & RBAC), and then establishes a secure, encrypted channel to the Enclave on behalf of the client.

### 2. Achieving the Security Properties (The CIA Triad + Non-repudiation)
To satisfy the rubric, we will map our implementation directly to the required security properties:

*   **A. Authentication (Who are you?)**
    *   **Client Authentication:** Achieved using JSON Web Tokens (JWT). When Party A logs in, they receive a cryptographically signed JWT. The Proxy verifies this signature before allowing the request to proceed.
    *   **Service Authentication (New):** Achieved using Simulated Enclave Attestation. Before the Proxy sends data to the Enclave, it will challenge the Enclave to prove its identity (verifying the `mrenclave` hash) to prevent spoofing attacks.
*   **B. Confidentiality & Integrity (Is the data safe and unaltered?)**
    *   **Mechanism:** ECDH Key Exchange + AES-256-GCM.
    *   **Implementation:** Currently, the Proxy sends plaintext to the Enclave. We will implement an Elliptic-Curve Diffie-Hellman (ECDH) key exchange between the Proxy and the Enclave to generate a shared ephemeral key. We will then use AES-256-GCM to encrypt the payload.
    *   *Why this gets top marks:* AES-GCM provides Authenticated Encryption with Associated Data (AEAD), ensuring both confidentiality (no one can read it) and integrity (no one can tamper with it in transit). ECDH provides Perfect Forward Secrecy.
*   **C. Non-Repudiation (Can you deny you did this?)**
    *   **Mechanism:** BLS12-381 Aggregate Signatures.
    *   **Implementation:** Every time a client successfully requests data from the Enclave, the Proxy generates a cryptographic BLS signature of that event and sends it to the Audit Service. These signatures aggregate into a single proof. The client mathematically cannot deny that they made the request.
*   **D. Authorization / Access Control (Are you allowed to do this?)**
    *   **Mechanism:** Bell-LaPadula (MLS) & OPA (RBAC).
    *   **Implementation:** The Proxy enforces No-Read-Up and No-Write-Down logic. Even if Party A establishes a secure connection, they are blocked if their clearance level is too low.

### 3. Threat Model & Mitigations (Required for Rubric)
In your presentation, you must defend your approach against attacks.

| Potential Threat | How Our Design Mitigates It |
| :--- | :--- |
| **Man-in-the-Middle (MitM) Attack** | **ECDH + AES-256-GCM:** An attacker intercepting traffic between the Proxy and Enclave only sees AES ciphertext. Without the ECDH ephemeral key, they cannot decrypt or alter it. |
| **Token Forgery / Spoofing** | **JWT Signatures:** The proxy rejects any token not signed by the Auth service's secret key. |
| **Data Spillage (Insider Threat)** | **Bell-LaPadula MLS:** A "Top Secret" user is mathematically blocked from writing sensitive data to an "Unclassified" endpoint. |
| **Malicious Server Spoofing** | **Enclave Attestation:** The Proxy verifies the Enclave's hardware hash (`mrenclave`) before sending data. |
| **Audit Log Tampering** | **BLS Aggregate Signatures:** If an attacker deletes a log entry, the BLS aggregate signature breaks, immediately alerting admins of tampering. |

### 4. Execution Plan (What we need to code next)
To get this ready for the May 18th evaluation, we should execute the following coding tasks in order:

1.  **Build the Crypto Module (Confidentiality/Integrity/Key Exchange):**
    *   Write the ECDH key exchange logic.
    *   Write the AES-256-GCM encryption/decryption functions.
    *   *Result:* Traffic between Proxy and Enclave becomes securely encrypted.
2.  **Build the Enclave Attestation (Service Authentication):**
    *   Create a `POST /attest` endpoint on the Enclave.
    *   Make the Proxy call this endpoint to verify the Enclave's identity before sending the AES-encrypted payload.
3.  **Implement the BLS Audit Logger (Non-repudiation):**
    *   Implement the BLS signature generation in the Proxy.
    *   Implement the receiving `/log` endpoint in the Audit service.

---

## Step 1: Prerequisites & Environment Setup
Install required tools and verify your environment.

**Current Implementation Status:** ✅ **Complete**
- **Explanation:** The project leverages `npm workspaces` declared in the root `package.json` to manage dependencies across `proxy`, `enclave`, `audit`, `dashboard`, and `auth` folders. A global `dev` script utilizes `concurrently` to spin up all microservices simultaneously with color-coded console outputs.

---

## Step 2: Project Structure & Configuration
Understand the layout and configure the shared `config/index.js`.

**Current Implementation Status:** ✅ **Complete**
- **Explanation:** The `config/index.js` file serves as the central brain of the ecosystem. It successfully exports all required foundational settings:
  - Microservice port mappings (3000, 4000, 5000, 6000).
  - JWT Secrets and expiration configurations.
  - The ordered MLS Bell-LaPadula levels (`['U', 'C', 'S', 'TS']`).
  - The master RBAC Policy matrix mapping roles (`admin`, `analyst`, `reader`, `operator`) to allowed resources, actions, and their minimum MLS clearance.
  - Mock hardware definitions like `mrenclave` strings and `bls` keys.

---

## Step 3: Auth Module — JWT Login & Verify
How users authenticate and how tokens are verified on every request.

**Current Implementation Status:** ✅ **Complete**
- **Explanation:** The Auth service (`auth/index.js`) is a fully operational Express application connected to MongoDB. 
  - **Registration:** `UserController.register` securely hashes passwords using `bcryptjs` and intelligently queries the shared `config/index.js` RBAC matrix to automatically assign the user's `clearanceLevel` based on their requested role.
  - **Login:** Upon a successful password match, `UserController.login` issues a signed JWT. Notably, it injects the entire RBAC permission scope (`resources` and `actions`) directly into the JWT payload, allowing downstream gateways to make zero-lookup authorization decisions.
  - **Inter-service Testing:** The Auth controller also implements novel testing endpoints (`/test-enclave` and `/test-mls`) which allow the Auth backend to act as a client, making direct API calls to the Enclave using the user's Bearer token to prove that network connections and MLS 403 blocks are working perfectly.
  - **Token Verification:** `proxy/middleware/security.js` effectively intercepts proxy requests, verifies the JWT signature, and injects user identity/clearance into the HTTP headers (`x-user-id`, `x-user-clearance`) before passing the request to backend services.

---

## Step 4: MLS Engine — Bell-LaPadula Policy
Lattice-based Multi-Level Security with no-read-up and no-write-down.

**Current Implementation Status:** ✅ **Complete**
- **Explanation:** The engine is active in `proxy/middleware/mls.js`. It works by mapping clearance strings (`U`, `C`, `S`, `TS`) to integer lattice weights (10, 20, 30, 40). 
  - When the Security Gateway processes a request, it compares the user's clearance against the route's required clearance.
  - **No-Read-Up:** If it is a Read operation (`GET`, `HEAD`), it throws a `403` if the user's clearance is lower than the route's.
  - **No-Write-Down:** If it is a Write operation (`POST`, `PUT`, etc.), it throws a `403` if the user's clearance is higher than the route's, preventing Top Secret data spillage into Unclassified domains.

---

## Step 5: RBAC Engine — OPA Policy Evaluation
Role-based access control: who can do what on which resources.

**Current Implementation Status:** ❌ **Not Implemented**
- **Explanation:** While the roles and policies are perfectly defined in `config/index.js`, and the Auth module successfully injects these permissions into the JWT, the actual *enforcement middleware* (`proxy/middleware/rbac.js`) is missing. The Proxy does not currently check if the request path matches the regex/wildcard paths allowed by the user's role.

---

## Step 6: Crypto Module — AES-256-GCM
Every payload is encrypted before it enters the enclave boundary.

**Current Implementation Status:** ✅ **Complete**
- **Explanation:** The cryptographic engine (`proxy/lib/crypto.js`) is fully implemented to ensure Confidentiality and Integrity. 
  - **Key Exchange:** Utilizes Elliptic-Curve Diffie-Hellman (ECDH) on the `secp256k1` curve to generate a shared ephemeral secret across the untrusted network (Perfect Forward Secrecy).
  - **Encryption:** The shared secret is hashed via SHA-256 into a 32-byte key, which is used to encrypt payloads via AES-256-GCM. 
  - **Integrity:** The GCM cipher attaches an Authentication Tag to the payload. If the payload is tampered with by a Man-in-the-Middle, the mathematical decryption will instantly reject it.

---

## Step 7: Enclave Service — TEE Simulation
Simulated Intel SGX / ARM CCA: attestation, key sealing, secure execution.

**Current Implementation Status:** ⚠️ **Partially Implemented**
- **Explanation:** The Enclave is running as a microservice on port 4000 (`enclave/index.js`), and it successfully defends itself by directly mounting the SDK's `createSecurityMiddleware` and `createMLSMiddleware('S')`—meaning only Secret or Top Secret tokens can even hit the base endpoint. However, it only exposes a generic `GET /` endpoint returning a mock JSON success message. The actual hardware simulation endpoints (`/attest`, `/seal`, `/execute`) have not been built.

---

## Step 8: BLS Audit Logger — Aggregate Signatures
Every event is BLS-signed; all signatures aggregate into one compact proof.

**Current Implementation Status:** ❌ **Not Implemented**
- **Explanation:** The mathematical BLS12-381 signature logic (`proxy/lib/bls.js`) is entirely missing. The proxy does not intercept successful or denied requests to emit log schemas, meaning no audit trails or aggregate signatures are being generated.

---

## Step 9: Audit Service — Immutable Log
Receives BLS-signed events, stores immutably, serves query and verify APIs.

**Current Implementation Status:** ⚠️ **Partially Implemented**
- **Explanation:** The Audit Service (`audit/index.js`) exists on port 5000 and is reachable, but it is currently just an empty shell. It responds to `GET /` with a placeholder message but lacks the required database connections and endpoints (`/log`, `/logs`, `/proof`, `/verify`, `/export`) to receive or query the signed events from the proxy.

---

## Step 10: Dashboard — React Monitoring UI
Live log viewer, BLS proof display, and request simulator at port 6000.

**Current Implementation Status:** ❌ **Not Implemented**
- **Explanation:** The dashboard directory is listed in the workspace configuration, but the actual folder and Vite/React application do not exist in the codebase.

---

## Step 11: Integration Testing
Run the test suite to verify all security properties.

**Current Implementation Status:** ⚠️ **Partially Implemented**
- **Explanation:** The official Jest/Mocha integration file (`tests/integration.test.js`) is completely empty. However, a custom native-fetch script (`test-flow.js`) exists in the root directory. This script successfully executes a 3-step End-to-End flow: it registers an admin user via the Gateway, logs in to obtain a JWT token, and passes that token to successfully access the protected Enclave route. It does not yet test MLS violations, RBAC, or Cryptographic properties.
