# Deployment

The backend is a single Node process with a local SQLite file. The frontend is a static Vite build. Deploy them separately or together with Docker.

## Backend on Render

`server/render.yaml` is a Blueprint. In Render choose New > Blueprint, point at the repo, and it creates the `mediq-backend` web service with root dir `server`, `npm ci`, `node src/server.js` and `/health` as the health check. Set `CLIENT_URL` to your frontend origin when prompted. `JWT_SECRET` is generated.

Manual setup instead: Web Service, Root Directory `server`, Build `npm ci`, Start `node src/server.js`, env vars `NODE_ENV=production`, `CLIENT_URL=<frontend origin>`, `JWT_SECRET=<random>`. Render sets `PORT` itself.

SQLite lives on the instance disk. On the free plan it is wiped on every deploy. Attach a persistent disk mounted at `/opt/render/project/src/server/data` to keep data.

## Backend on Railway

Create a service from the repo with root directory `server`. `server/railway.json` sets the build and start commands and `/health`. Add the same env vars as above. Add a volume mounted at `/app/data` for persistence.

## Frontend on Vercel

Import the repo, set Root Directory to `client`, framework Vite. Add env var `VITE_API_URL=https://<backend host>` (no trailing slash). `client/vercel.json` rewrites every path to `index.html`.

## Frontend on Netlify

Base directory `client`, build `npm run build`, publish `dist`. `client/public/_redirects` handles the SPA rewrite. Set `VITE_API_URL` the same way.

## Docker

```bash
VITE_API_URL=http://localhost:5000 JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

- `backend` image: node:20-alpine, native build tools only in the deps stage, runs as `node`, healthcheck on `/health`, data in the `mediq-data` named volume at `/app/data`.
- `frontend` image: Vite build baked with `VITE_API_URL`, served by unprivileged nginx on 8080 with SPA fallback.
- Override `CLIENT_URL` if the frontend is not on `http://localhost:8080`.

## Checklist after deploy

1. `GET https://<backend>/health` returns `{ "status": "healthy" }`.
2. Open the frontend, book an appointment, confirm the token appears in Reception.
3. Open the TV view in a second tab, call next from the Doctor desk, confirm the TV updates and chimes.
