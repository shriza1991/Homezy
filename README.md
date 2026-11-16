# Homezy — Property Rental Portal

Homezy is a full-stack MERN (MongoDB, Express, React, Node.js) web application designed for property discovery, listing, and rental request management.

---

## Local Docker demonstration

Install Docker Desktop (Linux containers) or Docker Engine with Compose v2+ and
start the engine. Run all commands below from the repository root. This setup is
local only and does not deploy anything externally.

### First setup

```bash
cp .env.docker.example .env.docker
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

In PowerShell, use `Copy-Item .env.docker.example .env.docker` for the copy.
Replace `JWT_SECRET` in `.env.docker` with the generated value. Keep this ignored
file local. The example uses only the private Docker MongoDB service and contains
no Atlas credentials. Do not copy `server/.env` into the images.

### Build, start, and seed

```bash
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up --build -d --wait
docker compose --env-file .env.docker ps
curl http://localhost:5000/api/health/live
curl http://localhost:5000/api/health/ready
docker compose --env-file .env.docker exec server npm run seed
```

The existing seed command **replaces all data in the configured demo database**.
Use the default dedicated `homezy_docker_demo` database. Its output should report
`MONGODB mode`; confirm readiness before seeding. Public demo/reset endpoints stay
disabled because the server runs in production mode.

Open **http://localhost:8080**. Use separate browser profiles or a normal window
and a private window for these accounts (password `password123` for each):

- Tenant: `tenant@homezy.com`
- Admin: `admin@homezy.com`
- Property owners: `owner1@homezy.com` through `owner4@homezy.com`

Keep the admin's notification bell open, submit a tenant application using
**Sample Data**, and check the live admin notification. Approve that application
from the admin rental requests page, then check the tenant's live notification
and updated application history. Do not reseed between these steps.

### Logs and stopping

```bash
docker compose --env-file .env.docker logs -f --tail=100
docker compose --env-file .env.docker logs -f server
# Stop and remove containers/network, preserving the named MongoDB volume:
docker compose --env-file .env.docker down
# Recreate containers with the same persisted database (do not reseed):
docker compose --env-file .env.docker up -d --wait
# Or restart existing containers with database readiness ordering:
docker compose --env-file .env.docker stop
docker compose --env-file .env.docker up -d --wait
```

### Reset only this Docker demo's data

These commands delete this Compose project's MongoDB volume and recreate the
demo. They do not affect a local MongoDB installation or an Atlas database.
Keep the default Docker `MONGO_URI` when using this procedure.

```bash
docker compose --env-file .env.docker down
docker volume rm homezy-demo_mongo_data
docker compose --env-file .env.docker up -d --wait
docker compose --env-file .env.docker exec server npm run seed
```

### Containers and configuration

- `client`: multi-stage Node build followed by Nginx serving only Vite's `dist`.
  Nginx falls back to `index.html` for React Router direct navigation/refresh.
- `server`: production Node image, production dependencies only, existing
  `npm start`, JWT authentication and role authorization unchanged. Its image
  probes `/api/health/live`; Compose probes `/api/health/ready` so the frontend
  starts only after MongoDB is connected.
- `mongo`: MongoDB 8 on the private Compose network, with no published host port.
  The named `homezy-demo_mongo_data` volume persists `/data/db` across container
  restarts and `down`/`up`. Client and server ports bind to host loopback only.

`VITE_API_URL` is a **build-time** setting passed as a Docker build argument.
Vite embeds it in JavaScript; adding an environment variable to a running Nginx
container cannot change that bundle. The existing frontend normalization accepts
the backend root or `/api` URL; Socket.IO uses the same URL with `/api` removed.
No runtime configuration script is needed. After changing this value, run
`docker compose --env-file .env.docker up --build -d --wait` again.

The default browser API URL is `http://localhost:5000/api`, not the internal
Docker hostname `server`. If changing ports, update `SERVER_PORT` together with
`VITE_API_URL`, and `CLIENT_PORT` together with `CLIENT_ORIGIN`. `PORT` controls
the server's internal port. CORS allows the configured origin for both HTTP and
Socket.IO; do not replace it with `*`. Always pass `--env-file .env.docker`:
Compose does not load that filename automatically. Existing npm development
commands and `client/.env` / `server/.env` remain independent of Docker.

Use the ordered `stop` / `up --wait` sequence above to restart the stack.
A simultaneous `docker compose restart` does not wait for MongoDB health; the
existing API falls back to memory if its initial database connection fails.
If readiness reports disconnected, run the ordered sequence to reconnect before
using or seeding the demo.

See [DOCKER_VERIFICATION.md](DOCKER_VERIFICATION.md) for commands actually run
and their results.

To repeat the Docker browser check, install the root test dependency with
`npm ci`, seed a fresh demo, then run `npm run test:docker`. It creates an
application using isolated tenant/admin Chrome sessions, checks actual WebSocket
events and role/CORS restrictions, and restarts all three containers to check
persistence. It expects Chrome at the Windows default path; set `CHROME_PATH`
to your Chrome/Chromium executable on other systems. For custom ports, also set
`DOCKER_CLIENT_URL` and `DOCKER_API_URL` in the test process environment.

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
