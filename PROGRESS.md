# Homezy Repository Progress Checklist

## Project Status Overview

| Milestone | Scope | Status | Automated Checks |
| :--- | :--- | :--- | :--- |
| **Milestone 1 (M1)** | Reliable backend startup, MongoDB Atlas configuration, health checks, environment examples, configurable frontend API connectivity | **COMPLETED** | **15/15 Passed** (10 server, 5 client) |
| **Experiment 3** | React hooks, state management, shared auth context, properties filtering, rental request form demo | **COMPLETED** | **Preserved & Passing** |
| **Milestone 2 (M2)** | Properties database schema, CRUD API, image uploads, and dynamic frontend listing integration | **PLANNED** | Pending M1 live Atlas configuration |
| **Milestone 3 (M3)** | Rental requests API, database persistence, tenant/owner workflows | **PLANNED** | Pending M2 |
| **Milestone 4 (M4)** | Role-based authorization, JWT authentication middleware, owner/admin dashboards | **PLANNED** | Pending M3 |

---

## Milestone 1 Implementation Checklist

### 1. Reliable Backend Startup & Architecture
- [x] Configure explicit npm scripts in `server/package.json` (`start`, `dev`, `test`).
- [x] Export modular `{ app, startServer }` from `server/server.js` with `require.main === module` guard.
- [x] Ensure server starts reliably without fatal unhandled exceptions when database is disconnected or starting up.
- [x] Implement graceful server shutdown handlers for `SIGINT` and `SIGTERM` signals.
- [x] Add central 404 handler and error-handling middleware (`server/middleware/errorMiddleware.js`).
- [x] Add reusable token generator utility (`server/utils/generateToken.js`).

### 2. MongoDB Atlas Configuration & Resilience
- [x] Enhanced connection logic in `server/config/db.js` with `serverSelectionTimeoutMS` (5000ms default) to avoid 30s hangs.
- [x] Event listeners for MongoDB connection state (`connected`, `error`, `disconnected`).
- [x] Diagnostic logging for MongoDB Atlas connection failures (IP access list guidance, credentials formatting).
- [x] Graceful degradation: returns HTTP 503 on database-dependent operations (`/api/auth/*`) while database is disconnected, preventing request hanging.

### 3. Comprehensive Health Checks
- [x] `GET /` — Root API welcome message, version, and runtime environment.
- [x] `GET /health` and `GET /api/health` — Full health status reporting uptime, timestamp, database connection status, readyState, and environment.
- [x] `GET /api/health/live` — Kubernetes / container liveness probe (HTTP 200).
- [x] `GET /api/health/ready` — Container / service readiness probe (HTTP 200 when DB connected, 503 when disconnected).

### 4. Environment Examples & Secrets Management
- [x] Created `server/.env.example` documenting `PORT`, `NODE_ENV`, `MONGO_URI` (Atlas SRV format), `MONGO_TIMEOUT_MS`, `JWT_SECRET`, and `CLIENT_ORIGIN`.
- [x] Created `client/.env.example` documenting `VITE_API_URL`.
- [x] Created root `.env.example` providing unified multi-tier configuration reference.
- [x] Kept `.env` files git-ignored via `.gitignore` to prevent secret leaks.

### 5. Configurable Frontend API Connectivity
- [x] Replaced hardcoded `http://localhost:5000/api` in `client/src/services/api.js` with dynamic `import.meta.env.VITE_API_URL` resolution with fallback.
- [x] Sanitized API base URL against trailing slashes.
- [x] Added `checkServerHealth()` client helper.
- [x] Preserved existing `authRequest(action, payload)` contract and error semantics.
- [x] Safely rendered user greeting in `client/src/components/Navbar.jsx` with optional chaining (`user?.name`).

---

## Verification & Check Results

All checks executed locally using Node v22.20.0 and npm 10.9.3:

1. **Server Unit & Integration Tests (`npm run server:test`)**:
   - `connectDB handles empty/missing URI without throwing or exiting` -> **PASS**
   - `connectDB handles invalid Atlas URI with fast timeout without throwing` -> **PASS**
   - `GET / returns root API welcome and version info` -> **PASS**
   - `GET /health returns health check structure` -> **PASS**
   - `GET /api/health returns identical health structure to /health` -> **PASS**
   - `GET /api/health/live returns liveness status 200` -> **PASS**
   - `GET /api/health/ready returns status based on DB readiness` -> **PASS**
   - `GET /api/nonexistent returns 404 with error message` -> **PASS**
   - `POST /api/auth/login returns 503 if database is disconnected` -> **PASS**
   - `CORS headers are returned on preflight request` -> **PASS**
   - **Result: 10/10 passed**

2. **Client Contract Tests (`npm run client:test`)**:
   - `filterProperties filters by search query and category (8 cases)` -> **PASS**
   - `API_URL is configured and exports string` -> **PASS**
   - `authRequest executes properly with mocked fetch` -> **PASS**
   - `authRequest throws readable error when server connection fails` -> **PASS**
   - `checkServerHealth inspects health endpoint` -> **PASS**
   - **Result: 5/5 passed**

3. **Client Linter (`npm run client:lint`)**:
   - `eslint .` -> **0 errors, 0 warnings (PASS)**

4. **Client Production Build (`npm run client:build`)**:
   - `vite build` -> **Built successfully in 487ms (PASS)**

---

## Remaining Manual Setup for MongoDB Atlas

*Note: Live Atlas services were not claimed to be tested because live Atlas credentials require manual user provisioning.*

To connect the application to your live MongoDB Atlas cluster, follow these steps:

1. **Create an Atlas Account & Cluster**:
   - Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Create a free **M0 Sandbox** cluster (AWS / Google Cloud / Azure).

2. **Create a Database User**:
   - Navigate to **Security** > **Database Access**.
   - Click **Add New Database User**.
   - Choose **Password** authentication. Note down the username and password.
   - Assign user privileges: **Read and write to any database** (or specific to `property_rental_portal`).
   - *Important*: If your password contains special characters (`@`, `:`, `#`, `%`, etc.), URL-encode them (e.g. `@` -> `%40`).

3. **Configure Network Access (IP Whitelist)**:
   - Navigate to **Security** > **Network Access**.
   - Click **Add IP Address**.
   - Choose **Add Current IP Address** for development, or add `0.0.0.0/0` (Allow Access from Anywhere) if testing across multiple networks.

4. **Retrieve Connection String**:
   - In **Database** > **Deployments**, click **Connect** next to your cluster.
   - Select **Drivers** (Node.js).
   - Copy the SRV connection URI:
     `mongodb+srv://<username>:<password>@<cluster-domain>/?retryWrites=true&w=majority`

5. **Update Server `.env`**:
   - Open `server/.env`.
   - Update `MONGO_URI` with your connection string and add the database name `/property_rental_portal`:
     ```env
     MONGO_URI=mongodb+srv://<username>:<password>@<cluster-domain>/property_rental_portal?retryWrites=true&w=majority
     ```

6. **Verify Live Connection**:
   - Run `npm run server:start` in the terminal.
   - Look for the console message: `[MongoDB] Connected to host: <cluster-domain>`.
   - Open `http://localhost:5000/api/health` in your browser. The response should display:
     ```json
     {
       "status": "ok",
       "database": {
         "status": "connected",
         "readyState": 1,
         "name": "property_rental_portal"
       }
     }
     ```
