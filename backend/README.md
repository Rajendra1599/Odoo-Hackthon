# TransitOps — Backend

Node.js + Express + MongoDB (Mongoose) API implementing the endpoints expected by the TransitOps frontend.

## Setup

```bash
cd transitops-backend
npm install
cp .env.example .env
```

Edit `.env` if needed — by default it expects MongoDB running locally at `mongodb://127.0.0.1:27017/transitops`.
If you don't have MongoDB installed locally, easiest options:
- Install MongoDB Community Server and run `mongod`, or
- Use a free MongoDB Atlas cluster and paste its connection string into `MONGODB_URI`.

## Seed demo data (users, vehicles, drivers)

```bash
npm run seed
```

This creates one login per role — **use these to sign in on the frontend**:

| Role              | Email                          | Password      |
|-------------------|---------------------------------|---------------|
| FleetManager      | fleetmanager@transitops.dev     | password123   |
| Driver            | driver@transitops.dev           | password123   |
| SafetyOfficer     | safety@transitops.dev           | password123   |
| FinancialAnalyst  | finance@transitops.dev          | password123   |

## Run

```bash
npm run dev      # auto-restarts on file change
# or
npm start
```

Server runs on `http://localhost:4000` by default — this matches the frontend's `vite.config.js` proxy target, so `npm run dev` in the frontend will forward `/api/*` here automatically.

## Auth

- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`
- `POST /api/auth/register` — create a new account (not wired into the current frontend UI, but handy for creating extra test users): `{ name, email, password, role }`. Role must be one of `FleetManager`, `Driver`, `SafetyOfficer`, `FinancialAnalyst`.
- `GET /api/auth/me` — current user from token

All other routes require `Authorization: Bearer <token>`.

## Role-based access (server-enforced)

| Resource | Read | Write |
|---|---|---|
| Vehicles | any authenticated role | FleetManager |
| Drivers | any authenticated role | FleetManager, SafetyOfficer |
| Trips | any authenticated role | FleetManager, Driver |
| Maintenance | any authenticated role | FleetManager |
| Fuel logs / Expenses | any authenticated role | FleetManager, FinancialAnalyst |
| Reports | FleetManager, FinancialAnalyst | — |

## Business logic implemented

- **Vehicle**: unique registration number (409 on duplicate); can't delete while `On Trip` or `In Shop`.
- **Driver**: unique license number (409 on duplicate); can't delete while `On Trip`.
- **Trip lifecycle**:
  - `POST /trips` → created as `Draft`. Validates cargo weight against the vehicle's `maxLoadKg` and rejects drivers with an expired license.
  - `PATCH /trips/:id/dispatch` → `Draft → Dispatched`; vehicle and driver flip to `On Trip`.
  - `PATCH /trips/:id/complete` → `Dispatched → Completed`; records final odometer + fuel consumed; vehicle/driver flip back to `Available`; vehicle odometer is updated if the final reading is higher.
  - `PATCH /trips/:id/cancel` → `Draft`/`Dispatched → Cancelled`; if it had been dispatched, vehicle and driver are restored to `Available`.
- **Maintenance**: creating a record immediately sets the vehicle to `In Shop`; closing it restores `Available` only if no other `Open` records exist for that vehicle.
- **Fuel logs / Expenses**: simple CRUD (create + list) scoped per vehicle.
- **Dashboard**: `/summary` (KPIs, filterable by type/status/region), `/utilization-trend` (last 7 days), `/recent-trips` (last 8).
- **Reports**: `/fuel-efficiency`, `/utilization`, `/operational-cost`, `/roi` (all accept `?from=&to=`), and `/export?format=csv&from=&to=` which streams a CSV of trips in range.
  - **ROI note**: the original spec doesn't define a revenue source per trip, so `roiPct` is returned as `0` for every vehicle — same placeholder behavior the frontend already expects (see the frontend's own README "Notes / known gaps").

## Notes

- Frontend form validation is duplicated server-side (required fields, ranges, license expiry, cargo capacity) so the API is safe to call directly / from other clients too.
- Passwords are hashed with bcrypt; sessions are stateless JWTs (`JWT_EXPIRES_IN`, default 7 days).
- This backend does not implement file uploads, PDF export, or notification emails — only what the frontend's pages currently call.
