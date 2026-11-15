# Homezy — Property Rental Portal

Homezy is a full-stack MERN (MongoDB, Express, React, Node.js) web application designed for property discovery, listing, and rental request management.

---

## Quickstart

### Prerequisites
- Node.js v18+ (tested on Node v22.20.0)
- npm v10+

### 1. Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Configuration
Copy the provided `.env.example` templates to `.env`:

```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env
```

### 3. Run the Development Servers
In the project root, you can run:

```bash
# Start backend server (default: port 5000)
npm run server:dev

# Start frontend Vite dev server (default: port 5173)
npm run client:dev
```

### 4. Run Automated Checks & Tests
```bash
# Run all server and client test suites
npm test

# Run individual checks
npm run server:test
npm run client:test
npm run client:lint
npm run client:build
```

---

## Health & Monitoring Endpoints

The backend provides built-in health inspection endpoints:

| Endpoint | Method | Purpose | Response |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Service root check | API status, version, and environment |
| `/health` or `/api/health` | `GET` | Full health probe | Uptime, database connection status, readyState, and environment |
| `/api/health/live` | `GET` | Kubernetes liveness probe | Status 200 with uptime |
| `/api/health/ready` | `GET` | Readiness probe | Status 200 (if DB connected), Status 503 (if DB disconnected) |

---

## MongoDB Atlas Setup Guide

Follow these steps to connect your backend to a free MongoDB Atlas cloud cluster:

1. **Sign Up / Log In**:
   Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and log into your account.

2. **Create a Free Cluster**:
   - Choose the **M0 Free Tier** cluster.
   - Select your preferred cloud provider and region closest to your location.
   - Click **Create Deployment**.

3. **Create Database Credentials**:
   - Under **Security** > **Database Access**, click **Add New Database User**.
   - Select **Password Authentication**.
   - Enter a username and password.
   - Under Database User Privileges, select **Read and write to any database**.
   - *Note*: If your password contains special characters (`@`, `:`, `/`, `%`, etc.), make sure they are [URL-encoded](https://en.wikipedia.org/wiki/Percent-encoding).

4. **Whitelist Network Access (IP Whitelist)**:
   - Under **Security** > **Network Access**, click **Add IP Address**.
   - For local development, click **Add Current IP Address**, or add `0.0.0.0/0` (Allow Access from Anywhere) to permit connections from dynamic IPs.

5. **Copy Connection String**:
   - In **Database** > **Deployments**, click **Connect**.
   - Choose **Drivers** and select Node.js.
   - Copy the SRV connection URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

6. **Configure `server/.env`**:
   - Paste the connection string into `server/.env` and append the database name `/property_rental_portal`:
     ```env
     MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/property_rental_portal?retryWrites=true&w=majority
     ```

7. **Verify Connectivity**:
   - Start the backend: `npm run server:start`.
   - The console will display: `[MongoDB] Connected to host: cluster0...`.
   - Access `http://localhost:5000/api/health` to confirm `status: "ok"`.

---

## Project Roadmap & Progress

For detailed milestone tracking, test logs, and feature completion status, consult [PROGRESS.md](file:///c:/Users/dyara/Homezy/PROGRESS.md).
