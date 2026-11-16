# MediQ technical notes

Internals reference. For setup, env vars, demo accounts and the API table see [README.md](./README.md).

## Layout

```
client/
  src/App.jsx                 tab switching between views, no router
  src/pages/                  PatientBookingPage, PatientQueueTracker, WaitingRoomTVPage,
                              ReceptionistDashboard, DoctorDeskPage, AnalyticsReportPage
  src/components/             Navbar, NotificationToast, PrintTokenModal, RescheduleModal,
                              MedicalPrescriptionModal, PatientHistoryModal, AudioChime.js
  src/context/AuthContext     JWT in localStorage (mediq_auth_token), demo role switcher
  src/context/SocketContext   socket.io-client connection and event listeners
  src/services/api.js         fetch wrapper, adds Authorization header

server/
  src/server.js               Express + http + Socket.io bootstrap, /health, seeding
  src/routes/apiRoutes.js     all REST routes under /api
  src/controllers/            auth, doctor, appointment, queue, patient, analytics
  src/middleware/             auth (JWT), cors, rateLimit, errorHandler, requestLogger
  src/services/notificationService.js   simulated SMS/WhatsApp log + socket emit
  src/utils/                  queue helpers, time, validation, error factories
  src/config/schema.js        CREATE TABLE / CREATE INDEX statements
  src/config/db.js            better-sqlite3 wrapper, seed defaults, PostgreSQL DDL export
  data/mediq.sqlite           created at runtime (gitignored)
```

## Data layer

`better-sqlite3` with `journal_mode = WAL` and `foreign_keys = ON`. The database file is created on first start in `server/data/`. If `server/data/clinic_data.json` (legacy JSON store) exists and the clinics table is empty, it is imported once.

Tables: `clinics`, `doctors`, `users`, `appointments`, `queue_tokens`, `consultations`, `notifications`.

Key columns:

- `appointments.status`: `booked | checked_in | cancelled | completed`
- `queue_tokens.tokenType`: `walk_in | appointment | emergency`
- `queue_tokens.priorityLevel`: `3` emergency, `2` senior, `1` normal
- `queue_tokens.status`: `waiting | called | serving | completed | no_show`
- `consultations`: one per completed token, stores diagnosis, prescription, vitals (JSON), followUpDate

Indexes cover `(doctorId, status)`, `(priorityLevel, checkInTime)`, `patientPhone`, `displayToken` and `tokenNumber` on `queue_tokens`, plus date/doctor, status, phone on `appointments`.

`GET /api/schema/postgresql` returns an equivalent PostgreSQL DDL for porting.

## Queue flow

1. Receptionist issues a walk-in token (`POST /queue/walk-in`) or checks in a booked appointment (`POST /appointments/:id/check-in`). Both create a `queue_tokens` row with status `waiting`. A patient can only hold one active token per doctor.
2. Ordering is `priorityLevel DESC, checkInTime ASC`. Priority can be changed later via `POST /queue/priority`.
3. Doctor calls next (`POST /queue/call-next`): the top waiting token moves to `serving`, `calledTime` and `waitTimeMinutes` are set, `doctors.currentServingTokenId` is updated, `TOKEN_CALLED` is emitted.
4. `POST /queue/recall` re-emits `TOKEN_RECALLED` so the TV chimes again. `POST /queue/no-show` sets `no_show`.
5. `POST /queue/complete` sets `completed`, saves a `consultations` row (vitals, diagnosis, prescription, follow-up) and clears `currentServingTokenId`.
6. Estimated wait for a waiting token is `(tokensAhead - 1) * avgConsultMinutes + remaining time of the current consultation`, computed from today's completed tokens for that doctor.

## Auth

- Staff login: `POST /auth/login` with email and password, returns a JWT (`JWT_SECRET`, expiry `JWT_EXPIRES_IN`). Client stores it and sends `Authorization: Bearer <token>`.
- `requireAuth` and `requireRole(...roles)` middleware in `server/src/middleware/auth.js`. In production `JWT_SECRET` is mandatory.
- Patients never log in. `POST /auth/verify-otp` checks the phone format and compares against `DEMO_OTP`. No SMS provider is wired.
- CORS: `CLIENT_URL` may be a comma separated list. Localhost origins are always allowed outside production.

## Socket.io

The server only emits; clients do not send custom events. On connect the server sends `INITIAL_STATE` with `{ clinic, queue, analytics }`.

| Event | Payload |
|---|---|
| `QUEUE_UPDATED` | `{ doctorId? }` |
| `TOKEN_CREATED` | token |
| `TOKEN_CALLED` | `{ token, doctor }` |
| `TOKEN_RECALLED` | `{ token, doctor }` |
| `TOKEN_COMPLETED` | `{ token, consultation }` |
| `TOKEN_NO_SHOW` | token |
| `APPOINTMENT_BOOKED` | appointment |
| `APPOINTMENT_RESCHEDULED` | appointment |
| `APPOINTMENT_CANCELLED` | appointment |
| `PATIENT_CHECKED_IN` | `{ appointment, token }` |
| `CLINIC_UPDATED` | clinic |
| `NOTIFICATION_DISPATCHED` | notification record |
| `DATA_RESET` | none |

Client side, `SocketContext` listens to these, refreshes local state, and on `TOKEN_CALLED` / `TOKEN_RECALLED` triggers the chime.

## Waiting room TV

`WaitingRoomTVPage` shows the serving token per doctor room and the upcoming queue. `AudioChime.js` plays a two-note chime with the Web Audio API (587 Hz then 880 Hz) and `window.speechSynthesis` reads out the token and room. No audio files are shipped.

## Notifications

`notificationService` writes an SMS / WhatsApp record to the `notifications` table for bookings, token issue, call-next and completion, then emits `NOTIFICATION_DISPATCHED`. The client shows these as toasts. Hooking a real provider means replacing the send step in that service.

## Analytics

`GET /api/analytics` aggregates today's tokens: totals by type, average wait and consultation minutes, per-doctor load. `POST /api/analytics/reset` clears transactional tables (used for demos). Any before/after comparison numbers shown in the analytics page are illustrative project targets, not measured results.
