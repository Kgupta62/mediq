# MediQ

Hospital appointment booking and real-time OPD queue management. Patients book or walk in and get a token, the receptionist manages the queue, the doctor calls patients from a desk view, and a waiting room TV screen shows "now serving" with a chime. All screens stay in sync over Socket.io.

Built as an academic project. Stack: Node + Express + Socket.io + SQLite (better-sqlite3) on the server, React 18 + Vite + Tailwind on the client.

## Screenshots

_Coming soon: booking flow, receptionist dashboard, doctor desk, waiting room TV._

## Quick start

Requires Node 20 or newer.

```bash
git clone <repo-url> mediq
cd mediq

# backend
cd server && npm install && npm start
# http://localhost:5000

# frontend (second terminal)
cd client && npm install && npm run dev
# http://localhost:5173
```

Or run both at once from the repo root: `./start-system.sh` (macOS/Linux) or `start-system.bat` (Windows).

With Docker:

```bash
docker compose up --build
# frontend http://localhost:8080, backend http://localhost:5000
```

The SQLite database is created automatically at `server/data/mediq.sqlite` and seeded with a clinic, three doctors and demo accounts on first start. Delete the file to reset.

## Environment variables

Server (`server/.env`, all optional for local dev):

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `5000` | HTTP and Socket.io port |
| `CLIENT_URL` | `http://localhost:5173` | Allowed CORS origin(s), comma separated. Localhost is always allowed outside production |
| `JWT_SECRET` | dev fallback | Required when `NODE_ENV=production` |
| `JWT_EXPIRES_IN` | `8h` | Token lifetime |
| `DEMO_OTP` | `1234` | OTP accepted for patient phone verification |
| `NODE_ENV` | | Set to `production` for deploys |

Client (`client/.env`):

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Backend base URL, no trailing slash |

## Demo accounts

Seeded on first run (`server/src/config/db.js`).

| Role | Email | Password |
|---|---|---|
| Receptionist | `receptionist@clinic.com` | `password123` |
| Doctor (Room 101) | `doctor.sharma@clinic.com` | `password123` |
| Doctor (Room 102) | `doctor.patel@clinic.com` | `password123` |
| Doctor (Room 103) | `doctor.ananya@clinic.com` | `password123` |

Patients do not log in. Booking asks for a phone OTP; the accepted code is `DEMO_OTP` (default `1234`). No real SMS is sent.

## Architecture

```
client (React SPA, tab switching in App.jsx)
  pages: PatientBooking, PatientQueueTracker, WaitingRoomTV,
         ReceptionistDashboard, DoctorDesk, AnalyticsReport
  services/api.js        REST client (VITE_API_URL)
  context/SocketContext  Socket.io client, chime triggers
        |  REST /api/*  +  Socket.io events
server (Express + Socket.io, ESM)
  routes/apiRoutes.js    all routes
  controllers/           auth, doctors, appointments, queue, patients, analytics
  services/notificationService.js  simulated SMS/WhatsApp, emits NOTIFICATION_DISPATCHED
  config/db.js           better-sqlite3 data layer, WAL mode, seed defaults
  config/schema.js       tables and indexes
        |
server/data/mediq.sqlite
```

Queue ordering: priority level (3 emergency, 2 senior, 1 normal) then check-in time. Token statuses: `waiting`, `called`, `serving`, `completed`, `no_show`.

Socket events emitted by the server: `INITIAL_STATE` (on connect), `QUEUE_UPDATED`, `TOKEN_CREATED`, `TOKEN_CALLED`, `TOKEN_RECALLED`, `TOKEN_COMPLETED`, `TOKEN_NO_SHOW`, `APPOINTMENT_BOOKED`, `APPOINTMENT_RESCHEDULED`, `APPOINTMENT_CANCELLED`, `PATIENT_CHECKED_IN`, `CLINIC_UPDATED`, `NOTIFICATION_DISPATCHED`, `DATA_RESET`.

## API

Base path `/api`. Source: `server/src/routes/apiRoutes.js`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Staff login, returns JWT |
| POST | `/auth/verify-otp` | Patient phone OTP check |
| GET | `/clinic` | Clinic info |
| PATCH | `/clinic` | Update clinic info / notice |
| GET | `/doctors` | List doctors |
| GET | `/doctors/:id` | Doctor by id |
| PATCH | `/doctors/:id/toggle` | Toggle availability |
| GET | `/appointments` | List appointments (filterable) |
| POST | `/appointments` | Book appointment |
| POST | `/appointments/:id/check-in` | Convert appointment to queue token |
| PATCH | `/appointments/:id/reschedule` | Change date / slot |
| DELETE | `/appointments/:id` | Cancel appointment |
| GET | `/queue` | List queue tokens |
| GET | `/queue/summary` | Per-doctor queue summary |
| POST | `/queue/walk-in` | Issue walk-in token |
| POST | `/queue/call-next` | Doctor calls next token |
| POST | `/queue/recall` | Re-announce current token |
| POST | `/queue/complete` | Complete consultation, save prescription |
| POST | `/queue/no-show` | Mark token no-show |
| POST | `/queue/priority` | Change token priority |
| GET | `/queue/token/:identifier` | Token status by token number or phone |
| GET | `/patients/:phone/history` | Patient visit history |
| GET | `/prescriptions/:id` | Prescription by id |
| GET | `/prescriptions/token/:identifier` | Prescription by token |
| GET | `/analytics` | Queue and wait-time stats |
| GET | `/notifications` | Simulated notification log |
| POST | `/analytics/reset` | Reset all data |
| GET | `/schema/postgresql` | PostgreSQL DDL export |

`GET /health` (outside `/api`) returns `{ status, timestamp }`.

## Testing

```bash
cd server && npx vitest run
cd client && npx vitest run
```

Client build check: `cd client && npm run build`.

## Deployment

- Backend: Render (`server/render.yaml`) or Railway (`server/railway.json`). Set `JWT_SECRET` and `CLIENT_URL` to the frontend origin. SQLite lives on local disk, so use a persistent disk or accept data loss on redeploy.
- Frontend: Vercel (`client/vercel.json`) or Netlify (`client/public/_redirects`). Set `VITE_API_URL` to the backend URL.
- Docker: `docker-compose.yml` runs both with a named volume for the database.

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for steps and [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for internals.

## License

MIT, see [LICENSE](./LICENSE).
