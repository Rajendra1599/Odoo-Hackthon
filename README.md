# TransitOps — Full Project (Frontend + Backend)

Smart Transport Operations Platform — React frontend + Node/Express/MongoDB backend.

```
transitops-project/
  frontend/    # React + Vite + Tailwind (the UI)
  backend/     # Node + Express + MongoDB (the API)
```

## Prerequisites
- Node.js 18+ installed
- MongoDB running locally (`mongod`), OR a free MongoDB Atlas connection string

## Run it — step by step

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set `MONGODB_URI` if you're not using a local MongoDB at the default address.

```bash
npm run seed     # creates demo login users + sample vehicles/drivers
npm run dev       # starts API on http://localhost:4000
```

Leave this terminal running.

### 2. Frontend

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev       # starts UI on http://localhost:5173
```

### 3. Open the app

Go to **http://localhost:5173** — you'll land on `/login`. Use one of the seeded demo accounts:

| Role              | Email                          | Password      |
|-------------------|---------------------------------|---------------|
| FleetManager      | fleetmanager@transitops.dev     | fleetmanager   |
| Driver            | driver@transitops.dev           | driver   |
| operation manager     | operations@transitops.dev          |operations   |
| despatcher | dispatcher@transitops.dev       |dispatcher  |
The frontend's dev server proxies every `/api/*` request to `http://localhost:4000` (see `frontend/vite.config.js`), so as long as both servers are running, everything just works — no extra configuration needed.

## More details
- `frontend/README.md` — pages, routes, role-based UI rules
- `backend/README.md` — every endpoint, business logic (trip dispatch/complete/cancel, maintenance status flips, ROI placeholder note, etc.)
