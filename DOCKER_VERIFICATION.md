# Docker verification — 2026-11-16

Repository inspected at `0e513c7` on `main`; `git fetch origin` succeeded and
`git rev-list --left-right --count HEAD...origin/main` returned `0 0` before edits.
No application authentication, authorization, CORS implementation, or development
startup behavior was changed. No external deployment was performed.

## Environment and setup

- Windows, Node `v22.20.0`, npm `10.9.3`.
- Docker Engine `29.6.1`, Docker Compose `v5.1.4`, Linux container engine.
- Docker Desktop was initially stopped and was started for verification.
- Created ignored `.env.docker` from `.env.docker.example`, replacing the JWT
  placeholder with `crypto.randomBytes(48).toString('hex')`. No local secret or
  existing `server/.env` was added to Git or copied into an image.

## Commands run and results

| Command | Result |
| --- | --- |
| `docker version`; `docker compose version` | Engine and Compose available after starting Docker Desktop |
| `docker compose --env-file .env.docker config --quiet` | Passed |
| `docker compose --env-file .env.docker build --progress plain` | Both production images built successfully |
| `docker compose --env-file .env.docker build` | Final rebuild passed after ignore-rule changes |
| `docker compose --env-file .env.docker run --rm --no-deps client nginx -t` | Nginx syntax and configuration passed |
| `docker compose --env-file .env.docker up --build -d --wait --wait-timeout 180` | Images built; initial MongoDB 5-second health probe timed out on this host; superseded by the final startup below |
| `docker compose --env-file .env.docker up -d --wait --wait-timeout 180` | Passed with final health timings; all three containers healthy |
| `docker compose --env-file .env.docker exec server npm run seed` | Passed in MONGODB mode: 7 users, 4 properties, 2 requests, 2 notifications |
| `curl.exe --fail --silent http://localhost:5000/api/health/live` | HTTP 200, `live: true` |
| `curl.exe --fail --silent http://localhost:5000/api/health/ready` | HTTP 200, `ready: true`, database `homezy_docker_demo`, host `mongo` |
| `curl.exe --fail --silent http://localhost:8080/healthz` | HTTP 200, `ok` |
| `npm run test:docker` (final corrected run) | **Passed, exit 0**: frontend title/load, direct SPA routes, isolated tenant/admin logins, tenant UI request, admin WebSocket event, admin UI approval, tenant WebSocket event without refresh, ordered all-container restart, persisted approval/notification/JWT session |
| `docker compose --env-file .env.docker stop` then `docker compose --env-file .env.docker up -d --wait --wait-timeout 180` | Passed, used by the final test to restart all three existing containers with readiness ordering |
| `npm run client:lint` | Passed, no lint errors/warnings |
| `npm run client:build` | Passed, Vite production bundle built |
| `npm run server:test` | Unrestricted rerun: **89 passed, 0 failed** |
| `npm run client:test` | **17 passed, 0 failed** |
| `npm run test:demo` | **3 passed, 2 failed** in the existing browser suite; see details below |
| `node --check scripts/verify-docker.cjs` | Passed |
| `git diff --check` | Passed (Git emitted only Windows line-ending notices) |

The initial server-test attempt inside the network sandbox failed with local
`fetch failed` errors and stalled on socket tests. It was stopped; the same
server test command with local networking available passed all 89 tests.

MongoDB's cold `mongosh` startup exceeded the initial five-second probe timeout.
The final Compose configuration gives it 15 seconds and a 30-second start period;
the API readiness probe has a 10-second timeout. Checks still execute a real
MongoDB ping and require a connected database. Startup ordering was observed as
MongoDB healthy → server healthy → client healthy. The initial in-progress
Compose invocation ended when its containers were recreated with these timings.

Production server image inspection used:

```bash
docker compose --env-file .env.docker run --rm --no-deps server node -e "const fs=require('fs'); console.log(JSON.stringify({node:process.version,production:process.env.NODE_ENV,uid:process.getuid(),dotenvFile:fs.existsSync('.env'),tests:fs.existsSync('test'),nodemon:fs.existsSync('node_modules/nodemon'),seed:fs.existsSync('scripts/seed.js')}))"
```

It returned Node `v22.23.5`,
`NODE_ENV=production`, UID `1000`, no `.env`, no `test` directory, no `nodemon`,
and the existing `scripts/seed.js` present. Image installation reported five
existing production dependency audit findings (one moderate, three high, one
critical); dependency versions/lockfiles were preserved for this Docker change.

The existing `test:demo` suite launches its own Express server, independently of
Compose. Landing, demo login, and mobile navigation passed. Catalog browsing
timed out waiting for `h2, h3` after direct navigation to Express's `/properties`
API alias. Its application check timed out waiting for `Application Submitted`
or `View My Applications`; the current UI says `Rental Request Submitted
Successfully`. These existing checks were not changed to hide failures. The
Docker verification uses Nginx routes, actual response statuses, and WebSocket
frames against the running stack.

The first Docker browser run passed login, authorization, submission, and the
admin WebSocket event, then its response matcher accidentally selected the CORS
`OPTIONS` preflight (204) instead of the approval response (200). The matcher was
corrected to require `PATCH`, the dedicated demo database was reseeded, and the
full check was rerun. No application or CORS changes were needed for that fix.

The next run passed both browser logins, UI submission, admin notification,
admin UI approval, and the tenant's live approval WebSocket event. A simultaneous
`docker compose --env-file .env.docker restart` exposed an existing API startup
limitation: MongoDB was not ready within its initial connection attempt, so the
API entered its memory fallback and `/api/health/ready` stayed unhealthy. Compose
`restart` does not enforce dependency health ordering. The README and Docker
verification now use `stop` followed by `up -d --wait --wait-timeout 180` to
restart the existing containers with database readiness ordering. Application
fallback logic was preserved, and readiness continues to reject disconnected mode.

Before reseeding for the final run, an API check logged in again and confirmed
that the earlier approved request `6afa80702018db5ea59c25e5` and its
`application_approved` notification were still present after recovery. This
confirmed MongoDB persistence independently of the browser test.

The final `npm run test:docker` exited 0 after all five verification groups
passed. Chrome cleanup printed Windows taskkill messages about child processes
that had already exited; these did not fail the test. The demo remains running
at `http://localhost:8080`, with the API at `http://localhost:5000` and MongoDB
data in `homezy-demo_mongo_data`. Only the generated local `.env.docker` holds
the JWT secret. To repeat the demonstration from its canonical starting data,
run the documented Docker seed command again.

## Repeat the container verification

```bash
docker compose --env-file .env.docker up --build -d --wait --wait-timeout 180
docker compose --env-file .env.docker ps
curl http://localhost:8080/
curl http://localhost:5000/api/health/live
curl http://localhost:5000/api/health/ready
docker compose --env-file .env.docker exec server npm run seed
npm run test:docker
```

The seed command replaces the dedicated Docker demo database. The Docker test
creates a real rental request and restarts the stack; it does not reset data.
Install the root browser dependency with `npm ci` if needed. Set `CHROME_PATH`
for a non-default Chrome/Chromium path. For changed ports, set
`DOCKER_CLIENT_URL` and `DOCKER_API_URL` as described in the README.
