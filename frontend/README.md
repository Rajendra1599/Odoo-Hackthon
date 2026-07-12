# TransitOps — Frontend

React + Tailwind CSS frontend for the TransitOps Smart Transport Operations Platform, built from the 8 hackathon pages: Login, Dashboard, Vehicle Registry, Driver Management, Trip Management, Maintenance, Fuel & Expense, and Reports & Analytics.

## Stack
- React 18 + Vite
- React Router v6 (client-side routing + RBAC-protected routes)
- Tailwind CSS (design tokens in `tailwind.config.js`)
- Recharts (dashboard/report charts)
- lucide-react (icons)

This is a **frontend-only** package. It expects a backend implementing the REST API described below at `/api/*` (see `vite.config.js` for the dev proxy target — update it to point at your backend).

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173. You'll land on `/login`.

## Project structure

```
src/
  main.jsx                 # app bootstrap (Router + AuthProvider)
  App.jsx                  # route table + RBAC guards
  index.css                # Tailwind directives + shared component classes
  context/AuthContext.jsx  # user/token state, login(), logout(), hasRole()
  components/
    ProtectedRoute.jsx     # redirects unauthenticated / wrong-role users
    Layout.jsx              # sidebar + topbar shell
    Modal.jsx, ConfirmDialog.jsx, Toast.jsx
    StatusPill.jsx          # colored status badges
    SearchableSelect.jsx    # searchable vehicle/driver pickers
    Skeleton.jsx, PageHeader.jsx, RestrictedAccess.jsx
  lib/
    api.js                  # fetch wrapper (auth header, error parsing)
    format.js                # currency/percent/date formatting
    useDebounce.js
  pages/
    Login.jsx
    Dashboard.jsx
    VehicleRegistry.jsx
    DriverManagement.jsx
    TripManagement.jsx
    Maintenance.jsx
    FuelExpense.jsx
    Reports.jsx
```

## Auth

`AuthContext` stores `{ user, token }` in `localStorage` and exposes:

```js
const { user, token, login, logout, hasRole } = useAuth();
```

`POST /api/auth/login` is expected to return `{ token, user: { id, name, role } }`. All subsequent API calls attach `Authorization: Bearer <token>` automatically via `src/lib/api.js`.

## Role-based access (frontend enforcement)

| Page | View | Create / Edit / Delete |
|---|---|---|
| Dashboard | All roles | — |
| Vehicle Registry | All roles | FleetManager only |
| Driver Management | All roles | FleetManager, SafetyOfficer |
| Trip Management | All roles (view) | FleetManager, Driver (create/dispatch/complete/cancel) |
| Maintenance | All roles | FleetManager only |
| Fuel & Expense | All roles | FleetManager, FinancialAnalyst |
| Reports & Analytics | FleetManager, FinancialAnalyst only | — |

This is enforced two ways:
1. **Route-level** — `<Protected allowedRoles={[...]}>` in `App.jsx` redirects users who land on a page they can't use (currently just Reports; the others are viewable by all authenticated roles with write actions hidden).
2. **Component-level** — pages call `hasRole(...)` from `AuthContext` to conditionally render "Add / Edit / Delete" buttons. The backend must still enforce these rules — this is UX only, not security.

## API endpoints expected

Each page's fetch calls map 1:1 to the endpoints defined in the TransitOps spec, e.g.:

- `POST /api/auth/login`
- `GET /api/dashboard/summary|utilization-trend|recent-trips`
- `GET/POST/PUT/DELETE /api/vehicles`
- `GET/POST/PUT/DELETE /api/drivers`, `GET /api/drivers/expiring`
- `GET/POST /api/trips`, `PATCH /api/trips/:id/dispatch|complete|cancel`
- `GET/POST /api/maintenance`, `PATCH /api/maintenance/:id/close`
- `GET/POST /api/fuel-logs`, `GET/POST /api/expenses`, `GET /api/expenses/summary`
- `GET /api/reports/fuel-efficiency|utilization|operational-cost|roi|export`

## Notes / known gaps
- **Vehicle ROI** needs a revenue figure that the spec doesn't define a source for (see the hackathon brief's own flag on this). The Reports page renders whatever `roiPct` the backend returns and shows a note if it's a placeholder.
- Business-rule validation (cargo weight, license expiry, status transitions) is duplicated client-side for good UX, but the backend is the source of truth — all forms surface server error messages (e.g. duplicate registration number, expired license) inline or via toast.
