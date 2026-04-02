# Auth Service

Provides a lightweight Identity Provider for the Security Gateway SDK.

## Running

It's wired into the main workspace. Run from the root directory:
```bash
npm install
npm run dev
```
It runs on port `7000`.

## API Endpoints

### 1. Register a new User
Registers a new user and hashes the password securely using bcrypt. You can specify a clearance level (defaults to `Unclassified`).

```bash
curl -X POST http://localhost:7000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "secretpassword",
    "clearanceLevel": "TopSecret"
  }'
```

### 2. Login
Logs in an existing user and returns a signed JWT.

```bash
curl -X POST http://localhost:7000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "secretpassword"
  }'
```

*(You will receive a token back which looks like `{"token": "eyJhbG..."}`)*

### 3. Verify Token / Get Current User
Used to decode and verify a token.

```bash
# Replace YOUR_JWT_TOKEN_HERE with the token from the login response
curl -X GET http://localhost:7000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 4. Test Enclave Inter-Service Connectivity
Forces the Auth Backend to make a direct backend-to-backend request to the secured Enclave service using your provided JWT Token to prove it can reach it.

```bash
# Replace YOUR_JWT_TOKEN_HERE with the token from the login response
curl -X GET http://localhost:7000/api/v1/users/test-enclave \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 5. Test Bell-LaPadula MLS Rules
Forces the Auth Backend to test whether the mathematical Enclave clearance requirements securely block or allow different token payloads. The Enclave requires Secret (`S`) clearance. 

```bash
# Try it with an Admin token (Unclassified) and see it get blocked!
# Then try it with an Operator token (Secret) and see it grant access!
curl -X GET http://localhost:7000/api/v1/users/test-mls \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```
